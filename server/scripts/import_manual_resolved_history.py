#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
import zipfile
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET


DEFAULT_WORKBOOK_PATH = Path("MANUAL DATA/IMMS NCAL.xlsx")
DEFAULT_REPORT_PATH = Path("MANUAL DATA/manual_import_resolved_report.json")
DB_PATH = Path("imms.db")
IMPORT_DETAIL_PREFIX = "Historical import from "

NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "p": "http://schemas.openxmlformats.org/package/2006/relationships",
}

HEADER = [
    "Priority",
    "Site",
    "No Case",
    "NCAL",
    "Status",
    "Level",
    "TS",
    "ODP/BTS",
    "Start",
    "Start Escalation Vendor",
    "End",
    "Duration",
    "Duration Vendor",
    "Problem",
    "Penyebab",
    "Action Terakhir",
    "Note",
    "Klasifikasi Gangguan",
    "Power Before",
    "Power After",
    "Start Pause",
    "End Pause",
    "Start Pause 2",
    "End Pause 2",
    "Total Duration Pause",
    "Total Duration Vendor",
]

HEADER_ORDER_TEXT = " | ".join(HEADER)


def col_to_index(col: str) -> int:
    number = 0
    for char in col:
        number = number * 26 + ord(char) - 64
    return number - 1


def normalize_text(value: Any) -> str:
    return str(value or "").strip()


def normalize_key(value: Any) -> str:
    text = normalize_text(value).lower()
    return re.sub(r"[^a-z0-9]+", "", text)


def slugify(value: Any) -> str:
    text = normalize_text(value).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "legacy"


def parse_excel_datetime(value: Any) -> datetime | None:
    text = normalize_text(value)
    if not text:
        return None

    if re.fullmatch(r"\d+(\.\d+)?", text):
        serial = float(text)
        return datetime(1899, 12, 30) + timedelta(days=serial)

    for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y %H.%M"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue

    return None


def to_sql_datetime(value: datetime | None) -> str | None:
    return value.strftime("%Y-%m-%d %H:%M:%S") if value else None


def trim_float_string(value: Any) -> str | None:
    text = normalize_text(value)
    if not text:
        return None
    if re.fullmatch(r"\d+\.0", text):
        return text[:-2]
    return text


def parse_duration_text(value: Any) -> int | None:
    text = normalize_text(value)
    if not text:
        return None

    if re.fullmatch(r"\d+(\.\d+)?", text):
        numeric = float(text)
        if numeric <= 0:
            return 0
        if numeric < 10:
            return max(int(round(numeric * 86400)), 0)
        return max(int(round(numeric)), 0)

    match = re.fullmatch(r"(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?", text)
    if match:
        hours = int(match.group(1))
        minutes = int(match.group(2))
        seconds = int(match.group(3) or 0)
        return max(hours * 3600 + minutes * 60 + seconds, 0)

    verbose = re.fullmatch(
        r"(?:(\d+)\s*(?:jam|hour|hours|h))?\s*"
        r"(?:(\d+)\s*(?:menit|minute|minutes|m))?\s*"
        r"(?:(\d+)\s*(?:detik|second|seconds|s))?",
        text.lower(),
    )
    if verbose and any(verbose.groups()):
        hours = int(verbose.group(1) or 0)
        minutes = int(verbose.group(2) or 0)
        seconds = int(verbose.group(3) or 0)
        return max(hours * 3600 + minutes * 60 + seconds, 0)

    return None


def seconds_to_hms(seconds: int | None) -> str | None:
    if seconds is None:
        return None
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    remaining_seconds = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{remaining_seconds:02d}"


def load_workbook_rows(path: Path) -> list[dict[str, str]]:
    with zipfile.ZipFile(path) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("a:si", NS):
                shared_strings.append("".join(node.text or "" for node in item.findall(".//a:t", NS)))

        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        relationship_map = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in relationships.findall("p:Relationship", NS)
        }
        sheet_id = workbook.find("a:sheets/a:sheet", NS).attrib[
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        ]
        sheet = ET.fromstring(archive.read(f"xl/{relationship_map[sheet_id]}"))

        rows: list[list[str]] = []
        for row in sheet.findall(".//a:sheetData/a:row", NS):
            values: list[str] = []
            last_index = -1
            for cell in row.findall("a:c", NS):
                ref = cell.attrib.get("r", "")
                match = re.match(r"([A-Z]+)", ref)
                index = col_to_index(match.group(1)) if match else last_index + 1
                while len(values) < index:
                    values.append("")

                cell_type = cell.attrib.get("t")
                raw_value = cell.find("a:v", NS)
                inline = cell.find("a:is", NS)

                if cell_type == "s" and raw_value is not None:
                    value = shared_strings[int(raw_value.text)]
                elif cell_type == "inlineStr" and inline is not None:
                    value = "".join(node.text or "" for node in inline.findall(".//a:t", NS))
                elif raw_value is not None:
                    value = raw_value.text or ""
                else:
                    value = ""

                values.append(value)
                last_index = index
            rows.append(values)

    header = rows[0]
    if header[: len(HEADER)] != HEADER:
        raise ValueError(
            "Unexpected workbook header order. "
            f"Expected: {HEADER_ORDER_TEXT}. "
            f"Found: {' | '.join(str(item) for item in header)}"
        )

    result = []
    for row in rows[1:]:
        if not any(row):
            continue
        record = {header[i]: (row[i] if i < len(row) else "") for i in range(len(header))}
        result.append(record)
    return result


def build_classification_map(connection: sqlite3.Connection) -> dict[tuple[str, str], int]:
    classification_map: dict[tuple[str, str], int] = {}
    for row in connection.execute(
        """
        SELECT id, klasifikasi, sub_klasifikasi
        FROM master_classifications
        WHERE is_active = 1
        """
    ):
        classification_map[(row["klasifikasi"], row["sub_klasifikasi"])] = row["id"]
    return classification_map


def detect_infra_prefix(value: str) -> str | None:
    match = re.match(r"^(ODP|ODC|POP|OSC|BTS|RADIO|OLT)\b", normalize_text(value).upper())
    return match.group(1) if match else None


def strip_infra_prefix(value: str) -> str:
    return re.sub(r"^(ODP|ODC|POP|OSC|BTS|RADIO|OLT)\s+", "", normalize_text(value).upper()).strip()


def format_distribution_body(value: str, prefix: str | None = None) -> str:
    body = strip_infra_prefix(value)
    if not body:
        return ""

    body = re.sub(r"\s+", " ", body)
    body = body.replace("_", "-")

    if prefix in {"BTS", "POP", "OSC", "RADIO", "OLT"}:
        return re.sub(r"\s*-\s*", "-", body)

    patterns = [
        (r"^([A-Z]+[0-9]?)\s+([A-Z])\s*-\s*(\d{1,2})$", lambda m: f"{m.group(1)}-{m.group(2)}{int(m.group(3)):02d}"),
        (r"^([A-Z]+[0-9]?)\s+([A-Z])\s*(\d{1,2})$", lambda m: f"{m.group(1)}-{m.group(2)}{int(m.group(3)):02d}"),
        (r"^([A-Z]+[0-9]?)\s*-\s*([A-Z])\s*(\d{1,2})$", lambda m: f"{m.group(1)}-{m.group(2)}{int(m.group(3)):02d}"),
        (r"^([A-Z]+[0-9]?)\s*-\s*(\d{1,2})$", lambda m: f"{m.group(1)}-{int(m.group(2)):02d}"),
        (r"^([A-Z]+[0-9]?)\s+(\d{1,2})$", lambda m: f"{m.group(1)}-{int(m.group(2)):02d}"),
    ]

    for pattern, formatter in patterns:
        match = re.match(pattern, body)
        if match:
            return formatter(match)

    return re.sub(r"\s*-\s*", "-", body)


def build_infrastructure_lookup(connection: sqlite3.Connection) -> dict[tuple[str, str], str]:
    lookup: dict[tuple[str, str], str] = {}
    for row in connection.execute(
        "SELECT type, level_1, level_2, level_3, level_4 FROM master_distribusi WHERE is_active = 1"
    ):
        for column in ("level_1", "level_2", "level_3", "level_4"):
            value = row[column]
            if not value:
                continue
            prefix = detect_infra_prefix(value)
            body = format_distribution_body(value, prefix)
            if prefix and body:
                lookup.setdefault((prefix, normalize_key(body)), normalize_text(value).upper())
    return lookup


def infer_infra_prefix(raw_value: str, ncal: str) -> str | None:
    explicit = detect_infra_prefix(raw_value)
    if explicit:
        return explicit

    body = format_distribution_body(raw_value)
    if ncal in {"YELLOW", "BLUE", "ORANGE"} and re.match(r"^[A-Z0-9]+-[A-Z]?\d{1,2}$", body):
        return "ODP"
    return None


def normalize_infrastructure_label(raw_value: str, ncal: str, lookup: dict[tuple[str, str], str]) -> str | None:
    raw = normalize_text(raw_value)
    if not raw or raw.upper() == "#N/A":
        return None

    explicit_prefix = detect_infra_prefix(raw)
    prefix = explicit_prefix or infer_infra_prefix(raw, ncal)
    body = format_distribution_body(raw, explicit_prefix)

    if prefix and body:
        canonical = lookup.get((prefix, normalize_key(body)))
        if canonical:
            return canonical
        return f"{prefix} {body}"

    return raw.upper()


def select_classification_pair(raw_classification: str, problem: str, cause: str) -> tuple[str, str] | None:
    alias_map = {
        "adaptorbermasalah": ("Kelistrikan", "Adaptor Bermasalah / Terbakar"),
        "droplastmileputus": ("Kabel Bermasalah", "Core Rusak/Patah Dalam"),
        "fakelos": ("Link & Logical", "Fake LOS (Software/Config)"),
        "induksipetir": ("Kelistrikan", "PSU Bermasalah / Terbakar"),
        "inputodpbermasalah": ("Titik Terminasi (ODP/Roset)", "Input ODP Bermasalah"),
        "kabelbendingterjepit": ("Kabel Bermasalah", "Bending/Terjepit"),
        "kabelcorerusak": ("Kabel Bermasalah", "Core Rusak/Patah Dalam"),
        "kabeldimakanhewan": ("Kabel Putus", "Dimakan Hewan (Tikus/Tupai)"),
        "kabeldipotongvandalisme": ("Kabel Putus", "Dipotong/Vandalisme"),
        "kabelketarikalatberatkendaraan": ("Kabel Putus", "Ketarik Alat Berat/Kendaraan"),
        "kabelputusimbasinstallasi": ("Kabel Putus", "Imbas Instalasi Baru"),
        "kabelputusimbasinstalasi": ("Kabel Putus", "Imbas Instalasi Baru"),
        "kabelputusimbaspembangunan": ("Kabel Putus", "Ketarik Alat Berat/Kendaraan"),
        "kabelputusimbastroubleshooting": ("Kabel Putus", "Imbas Troubleshooting"),
        "kabelsambunganrosetputus": ("Titik Terminasi (ODP/Roset)", "Sambungan/Roset Putus"),
        "kabeltertimpapohonranting": ("Kabel Putus", "Tertimpa Pohon/Ranting"),
        "kabeldropnglewerlonggar": ("Kabel Bermasalah", "Drop Cable Nglewer/Longgar"),
        "kabelrapuhrantas": ("Kabel Bermasalah", "Kabel Rapuh/Rantas/Getas"),
        "kabellanbermasalah": ("Sisi Pelanggan (CPE/LAN)", "Kabel LAN Bermasalah/Putus"),
        "kelistrikanbackuppowerhabis": ("Kelistrikan", "Backup Power Habis / Genset Mati"),
        "kelistrikaninvertermati": ("Kelistrikan", "Inverter Mati/Rusak"),
        "kelistrikanpsubermasalah": ("Kelistrikan", "PSU Bermasalah / Terbakar"),
        "kendalaperangkatap": ("Perangkat Aktif", "AP (Access Point) Rusak"),
        "kendalaportethernet": ("Perangkat Aktif", "Kendala Port Ethernet/SFP"),
        "odpcorebending": ("Titik Terminasi (ODP/Roset)", "ODP Core Bending/Kotor"),
        "odppigtailputus": ("Titik Terminasi (ODP/Roset)", "Pigtail Putus/Rusak"),
        "poebermasalah": ("Kelistrikan", "POE Bermasalah / Mati"),
        "patchcordrusak": ("Titik Terminasi (ODP/Roset)", "Patchcord Rusak/Kotor"),
        "perangakatswitchhangrusak": ("Perangkat Aktif", "Switch Hang/Rusak"),
        "perangkatswitchhangrusak": ("Perangkat Aktif", "Switch Hang/Rusak"),
        "perangkataprusak": ("Perangkat Aktif", "AP (Access Point) Rusak"),
        "perangkatmodemrusak": ("Perangkat Aktif", "Modem (ONU/ONT) Rusak/Mati"),
        "perangkatrouterrusak": ("Perangkat Aktif", "Router Rusak/Hang"),
        "rabasrabas": ("Kabel Bermasalah", "Rabas-rabas (Dekat Pohon)"),
        "redamantinggi": ("Titik Terminasi (ODP/Roset)", "Redaman Tinggi (Splicing/Loss)"),
        "kelistrikanpic": ("Kelistrikan", "Adaptor Bermasalah / Terbakar"),
    }

    raw_key = normalize_key(raw_classification)
    if raw_key in alias_map:
        return alias_map[raw_key]

    combined = normalize_key(f"{raw_classification} {problem} {cause}")
    keyword_rules = [
        (("fakelos",), ("Link & Logical", "Fake LOS (Software/Config)")),
        (("pigtail",), ("Titik Terminasi (ODP/Roset)", "Pigtail Putus/Rusak")),
        (("patchcord",), ("Titik Terminasi (ODP/Roset)", "Patchcord Rusak/Kotor")),
        (("inputodp",), ("Titik Terminasi (ODP/Roset)", "Input ODP Bermasalah")),
        (("redaman", "loss"), ("Titik Terminasi (ODP/Roset)", "Redaman Tinggi (Splicing/Loss)")),
        (("corebending", "odpcore"), ("Titik Terminasi (ODP/Roset)", "ODP Core Bending/Kotor")),
        (("sambungan", "roset"), ("Titik Terminasi (ODP/Roset)", "Sambungan/Roset Putus")),
        (("dimakanhewan", "tikus", "tupai", "hewan"), ("Kabel Putus", "Dimakan Hewan (Tikus/Tupai)")),
        (("vandalisme", "dipotong"), ("Kabel Putus", "Dipotong/Vandalisme")),
        (("ketarik", "alatberat", "kendaraan", "tersangkuttruk", "pembangunan"), ("Kabel Putus", "Ketarik Alat Berat/Kendaraan")),
        (("troubleshooting",), ("Kabel Putus", "Imbas Troubleshooting")),
        (("instalasi", "installasi", "instal"), ("Kabel Putus", "Imbas Instalasi Baru")),
        (("tertimpapohon", "ranting", "pohon"), ("Kabel Putus", "Tertimpa Pohon/Ranting")),
        (("bending", "terjepit"), ("Kabel Bermasalah", "Bending/Terjepit")),
        (("drop", "nglewer", "longgar"), ("Kabel Bermasalah", "Drop Cable Nglewer/Longgar")),
        (("rapuh", "rantas", "getas"), ("Kabel Bermasalah", "Kabel Rapuh/Rantas/Getas")),
        (("corerusak", "patahdalam", "droplastmileputus"), ("Kabel Bermasalah", "Core Rusak/Patah Dalam")),
        (("rabas",), ("Kabel Bermasalah", "Rabas-rabas (Dekat Pohon)")),
        (("lan",), ("Sisi Pelanggan (CPE/LAN)", "Kabel LAN Bermasalah/Putus")),
        (("router",), ("Perangkat Aktif", "Router Rusak/Hang")),
        (("modem", "onu", "ont"), ("Perangkat Aktif", "Modem (ONU/ONT) Rusak/Mati")),
        (("switch",), ("Perangkat Aktif", "Switch Hang/Rusak")),
        (("accesspoint", "ap", "ruijie", "unifi", "totolink"), ("Perangkat Aktif", "AP (Access Point) Rusak")),
        (("portethernet", "ethernet", "sfp"), ("Perangkat Aktif", "Kendala Port Ethernet/SFP")),
        (("poe",), ("Kelistrikan", "POE Bermasalah / Mati")),
        (("inverter",), ("Kelistrikan", "Inverter Mati/Rusak")),
        (("backup", "genset"), ("Kelistrikan", "Backup Power Habis / Genset Mati")),
        (("adaptor", "korslet", "stopkontak"), ("Kelistrikan", "Adaptor Bermasalah / Terbakar")),
        (("psu", "petir"), ("Kelistrikan", "PSU Bermasalah / Terbakar")),
    ]

    for keywords, pair in keyword_rules:
        if any(keyword in combined for keyword in keywords):
            return pair

    return None


def build_initial_state(connection: sqlite3.Connection) -> dict[str, Any]:
    classification_map = build_classification_map(connection)
    infrastructure_lookup = build_infrastructure_lookup(connection)

    customers_by_key: dict[str, int] = {}
    for row in connection.execute("SELECT id, brand_site, company_name FROM master_customer"):
        for value in (row["brand_site"], row["company_name"]):
            key = normalize_key(value)
            if key and key not in customers_by_key:
                customers_by_key[key] = row["id"]

    users_by_key: dict[str, sqlite3.Row] = {}
    for row in connection.execute("SELECT id, name, username, role, is_active FROM users"):
        name_key = normalize_key(row["name"])
        if name_key and name_key not in users_by_key:
            users_by_key[name_key] = row

    existing_case_nos = {row["case_no"] for row in connection.execute("SELECT case_no FROM incidents")}

    importer_user = connection.execute(
        "SELECT id FROM users WHERE role = 'admin' ORDER BY is_active DESC, id ASC LIMIT 1"
    ).fetchone()
    importer_user_id = importer_user["id"] if importer_user else 1

    return {
        "classification_map": classification_map,
        "customers_by_key": customers_by_key,
        "users_by_key": users_by_key,
        "infrastructure_lookup": infrastructure_lookup,
        "existing_case_nos": existing_case_nos,
        "importer_user_id": importer_user_id,
    }


def next_legacy_sequence(connection: sqlite3.Connection, table: str, column: str, prefix: str) -> int:
    like_value = f"{prefix}%"
    max_value = 0
    for row in connection.execute(f"SELECT {column} AS value FROM {table} WHERE {column} LIKE ?", (like_value,)):
        text = normalize_text(row["value"])
        match = re.search(r"(\d+)$", text)
        if match:
            max_value = max(max_value, int(match.group(1)))
    return max_value + 1


def ensure_legacy_user(
    connection: sqlite3.Connection,
    users_by_key: dict[str, sqlite3.Row],
    raw_name: str,
    counters: dict[str, int],
) -> int | None:
    name = normalize_text(raw_name)
    if not name:
        return None

    key = normalize_key(name)
    existing = users_by_key.get(key)
    if existing:
        return existing["id"]

    username_base = f"legacy-{slugify(name)}"
    username = username_base
    suffix = 2
    while connection.execute("SELECT 1 FROM users WHERE username = ?", (username,)).fetchone():
        username = f"{username_base}-{suffix}"
        suffix += 1

    employee_id = f"LEGACY-{counters['legacy_user']:03d}"
    counters["legacy_user"] += 1

    role = "noc" if key in {"helpdesk", "networkdispatcher"} else "technician"
    connection.execute(
        """
        INSERT INTO users (username, password_hash, role, name, email, employee_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 0)
        """,
        (username, "!legacy-import!", role, name, None, employee_id),
    )
    user_id = connection.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
    row = connection.execute(
        "SELECT id, name, username, role, is_active FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    users_by_key[key] = row
    return user_id


def ensure_customer(
    connection: sqlite3.Connection,
    customers_by_key: dict[str, int],
    site_name: str,
    row: dict[str, str],
    counters: dict[str, int],
) -> int | None:
    site = normalize_text(site_name)
    if not site:
        return None

    key = normalize_key(site)
    existing = customers_by_key.get(key)
    if existing:
        return existing

    customer_id = f"LEGACY-CUST-{counters['legacy_customer']:04d}"
    service_id = f"LEGACY-SVC-{counters['legacy_service']:04d}"
    counters["legacy_customer"] += 1
    counters["legacy_service"] += 1

    connection.execute(
        """
        INSERT INTO master_customer (
          customer_id,
          service_id,
          company_name,
          brand_site,
          address,
          service_type,
          grade,
          support_level,
          link_coverage,
          sla,
          city,
          province,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """,
        (
            customer_id,
            service_id,
            site,
            site,
            None,
            "Legacy Manual Import",
            normalize_text(row.get("Priority")) or None,
            trim_float_string(row.get("Level")),
            normalize_text(row.get("ODP/BTS")) or None,
            None,
            None,
            None,
        ),
    )
    customer_row_id = connection.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
    customers_by_key[key] = customer_row_id
    return customer_row_id


def build_detail_text(
    workbook_label: str,
    desired_case_no: str,
    original_case_no: str,
    row: dict[str, str],
    raw_ts: str,
    classification_source: str,
    classification_mapped: tuple[str, str] | None,
) -> str:
    lines = [
        f"Historical import from {workbook_label}",
        f"Original Case No: {original_case_no}",
        f"Source Site: {normalize_text(row.get('Site')) or '—'}",
        f"Priority: {normalize_text(row.get('Priority')) or '—'}",
        f"Manual Technician: {raw_ts or '—'}",
    ]

    if desired_case_no != original_case_no:
        lines.append(f"Imported Case No: {desired_case_no}")

    if classification_source:
        lines.append(f"Source Classification: {classification_source}")

    if classification_mapped:
        lines.append(
            "Mapped Classification: "
            f"{classification_mapped[0]} / {classification_mapped[1]}"
        )

    if normalize_text(row.get("Note")):
        lines.append(f"Manual Note: {normalize_text(row.get('Note'))}")

    if normalize_text(row.get("Start Escalation Vendor")):
        lines.append(
            "Vendor Escalation Started: "
            f"{normalize_text(row.get('Start Escalation Vendor'))}"
        )

    return "\n".join(lines)


def insert_audit_logs(
    connection: sqlite3.Connection,
    incident_id: int,
    importer_user_id: int,
    technician_id: int | None,
    start_time_sql: str,
    end_time_sql: str,
    update_time_sql: str,
    escalation_time_sql: str | None,
    root_cause: str | None,
    last_action: str | None,
) -> None:
    connection.execute(
        """
        INSERT INTO audit_logs (incident_id, user_id, action, details, timestamp)
        VALUES (?, ?, 'CREATE', ?, ?)
        """,
        (
            incident_id,
            importer_user_id,
            "Historical incident imported from manual workbook before IMMS go-live.",
            start_time_sql,
        ),
    )

    if escalation_time_sql:
        connection.execute(
            """
            INSERT INTO audit_logs (incident_id, user_id, action, details, timestamp)
            VALUES (?, ?, 'ESCALATE', ?, ?)
            """,
            (
                incident_id,
                importer_user_id,
                "Vendor escalation recorded in manual workbook.",
                escalation_time_sql,
            ),
        )

    details: list[str] = []
    if root_cause:
        details.append(f"Cause: {root_cause}")
    if last_action:
        details.append(f"Last Action: {last_action}")
    if details:
        connection.execute(
            """
            INSERT INTO audit_logs (incident_id, user_id, action, details, timestamp)
            VALUES (?, ?, 'UPDATE', ?, ?)
            """,
            (
                incident_id,
                technician_id or importer_user_id,
                " | ".join(details),
                update_time_sql,
            ),
        )

    connection.execute(
        """
        INSERT INTO audit_logs (incident_id, user_id, action, details, timestamp)
        VALUES (?, ?, 'CLOSE', ?, ?)
        """,
        (
            incident_id,
            technician_id or importer_user_id,
            "Resolved before IMMS go-live and imported from historical workbook.",
            end_time_sql,
        ),
    )


def insert_pause_logs(
    connection: sqlite3.Connection,
    incident_id: int,
    row: dict[str, str],
    incident_start_dt: datetime,
    incident_end_dt: datetime,
) -> tuple[int, list[dict[str, Any]], list[dict[str, Any]]]:
    pause_slots = [
        ("Start Pause", "End Pause"),
        ("Start Pause 2", "End Pause 2"),
    ]

    pause_segments: list[dict[str, Any]] = []
    invalid_segments: list[dict[str, Any]] = []
    normalized_windows: list[tuple[datetime, datetime]] = []
    for start_key, end_key in pause_slots:
        start_dt = parse_excel_datetime(row.get(start_key))
        end_dt = parse_excel_datetime(row.get(end_key))
        if not start_dt:
            continue

        duration_seconds = None
        normalized_start = start_dt
        normalized_end = end_dt
        if end_dt:
            normalized_start = max(start_dt, incident_start_dt)
            normalized_end = min(end_dt, incident_end_dt)
            if normalized_end <= normalized_start:
                invalid_segments.append(
                    {
                        "start_key": start_key,
                        "end_key": end_key,
                        "start": to_sql_datetime(start_dt),
                        "end": to_sql_datetime(end_dt),
                        "reason": "pause window falls outside incident window",
                    }
                )
                continue
            duration_seconds = max(int((normalized_end - normalized_start).total_seconds()), 0)
            normalized_windows.append((normalized_start, normalized_end))

        connection.execute(
            """
            INSERT INTO pause_logs (incident_id, pause_start, pause_end, reason, duration_seconds, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                incident_id,
                to_sql_datetime(normalized_start),
                to_sql_datetime(normalized_end),
                "Historical pause imported from manual workbook.",
                duration_seconds,
                to_sql_datetime(normalized_start),
            ),
        )

        pause_segments.append(
            {
                "start_key": start_key,
                "end_key": end_key,
                "start": to_sql_datetime(normalized_start),
                "end": to_sql_datetime(normalized_end),
                "duration_seconds": duration_seconds,
            }
        )

    merged_windows: list[list[datetime]] = []
    for start_dt, end_dt in sorted(normalized_windows, key=lambda item: item[0]):
        if not merged_windows or start_dt > merged_windows[-1][1]:
            merged_windows.append([start_dt, end_dt])
        else:
            merged_windows[-1][1] = max(merged_windows[-1][1], end_dt)

    total_pause_seconds = sum(
        max(int((end_dt - start_dt).total_seconds()), 0)
        for start_dt, end_dt in merged_windows
    )

    return total_pause_seconds, pause_segments, invalid_segments


def choose_case_number(original_case_no: str, occurrence: int) -> str:
    return original_case_no if occurrence == 1 else f"{original_case_no}-L{occurrence:02d}"


def import_history(rows: list[dict[str, str]], apply_changes: bool, workbook_label: str) -> dict[str, Any]:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")

    state = build_initial_state(connection)
    classification_map = state["classification_map"]
    customers_by_key = state["customers_by_key"]
    users_by_key = state["users_by_key"]
    infrastructure_lookup = state["infrastructure_lookup"]
    existing_case_nos = set(state["existing_case_nos"])
    importer_user_id = state["importer_user_id"]

    counters = {
        "legacy_customer": next_legacy_sequence(connection, "master_customer", "customer_id", "LEGACY-CUST-"),
        "legacy_service": next_legacy_sequence(connection, "master_customer", "service_id", "LEGACY-SVC-"),
        "legacy_user": next_legacy_sequence(connection, "users", "employee_id", "LEGACY-"),
    }

    report: dict[str, Any] = {
        "workbook_path": workbook_label,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "apply": apply_changes,
        "source_rows": len(rows),
        "done_rows": 0,
        "skipped_non_done": 0,
        "skipped_missing_case": 0,
        "skipped_invalid_datetime": [],
        "skipped_existing_case": [],
        "inserted_incidents": 0,
        "created_legacy_customers": 0,
        "created_legacy_users": 0,
        "duplicate_case_suffixes": [],
        "unmapped_classifications": Counter(),
        "normalized_infrastructure": [],
        "duration_mismatches": [],
        "pause_mismatches": [],
        "invalid_pause_segments": [],
        "ncals": Counter(),
        "site_placeholders": [],
        "legacy_users": [],
    }

    case_occurrence = Counter()
    created_customer_ids_before = counters["legacy_customer"]
    created_user_ids_before = counters["legacy_user"]

    if apply_changes:
        connection.execute("BEGIN")

    try:
        for row in rows:
            status = normalize_text(row.get("Status")).lower()
            if status != "done":
                report["skipped_non_done"] += 1
                continue

            report["done_rows"] += 1

            original_case_no = normalize_text(row.get("No Case"))
            if not original_case_no:
                report["skipped_missing_case"] += 1
                continue

            case_occurrence[original_case_no] += 1
            desired_case_no = choose_case_number(original_case_no, case_occurrence[original_case_no])

            if desired_case_no in existing_case_nos:
                report["skipped_existing_case"].append(desired_case_no)
                continue

            ncal = normalize_text(row.get("NCAL")).upper() or "YELLOW"
            report["ncals"][ncal] += 1
            site_name = normalize_text(row.get("Site"))
            raw_odp_bts = normalize_text(row.get("ODP/BTS")) or (
                site_name if ncal in {"ORANGE", "RED", "BLACK"} else ""
            )
            normalized_odp_bts = normalize_infrastructure_label(raw_odp_bts, ncal, infrastructure_lookup)

            start_dt = parse_excel_datetime(row.get("Start"))
            end_dt = parse_excel_datetime(row.get("End"))
            escalation_dt = parse_excel_datetime(row.get("Start Escalation Vendor"))

            if not start_dt or not end_dt:
                report["skipped_invalid_datetime"].append(desired_case_no)
                continue

            gross_seconds = max(int((end_dt - start_dt).total_seconds()), 0)
            workbook_duration_seconds = parse_duration_text(row.get("Duration"))
            workbook_pause_seconds = parse_duration_text(row.get("Total Duration Pause"))
            workbook_vendor_duration_seconds = parse_duration_text(row.get("Total Duration Vendor"))
            update_time = end_dt - timedelta(seconds=1) if end_dt > start_dt else end_dt

            raw_ts = normalize_text(row.get("TS"))
            technician_id = None
            if raw_ts:
                user_key = normalize_key(raw_ts)
                existing_user = users_by_key.get(user_key)
                technician_id = existing_user["id"] if existing_user else None
                if technician_id is None and apply_changes:
                    technician_id = ensure_legacy_user(connection, users_by_key, raw_ts, counters)

            customer_id = None
            if ncal in {"YELLOW", "BLUE"} and site_name:
                customer_key = normalize_key(site_name)
                customer_id = customers_by_key.get(customer_key)
                if customer_id is None and apply_changes:
                    customer_id = ensure_customer(connection, customers_by_key, site_name, row, counters)
                    if customer_id:
                        report["site_placeholders"].append(site_name)

            raw_classification = normalize_text(row.get("Klasifikasi Gangguan"))
            classification_pair = select_classification_pair(
                raw_classification,
                normalize_text(row.get("Problem")),
                normalize_text(row.get("Penyebab")),
            )
            classification_id = classification_map.get(classification_pair) if classification_pair else None
            if raw_classification and classification_id is None:
                report["unmapped_classifications"][raw_classification] += 1

            detail_text = build_detail_text(
                workbook_label,
                desired_case_no,
                original_case_no,
                row,
                raw_ts,
                raw_classification,
                classification_pair,
            )

            if apply_changes:
                connection.execute(
                    """
                    INSERT INTO incidents (
                      case_no,
                      customer_id,
                      ncal,
                      odp_bts,
                      level_support,
                      initial_problem,
                      status,
                      technician_id,
                      root_cause,
                      last_action,
                      power_before,
                      power_after,
                      classification_id,
                      start_time,
                      start_action_time,
                      end_time,
                      total_pause_duration_seconds,
                      duration_gross_seconds,
                      duration_nett_seconds,
                      created_by,
                      created_at,
                      updated_at,
                      detail,
                      pic
                    )
                    VALUES (?, ?, ?, ?, ?, ?, 'done', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        desired_case_no,
                        customer_id,
                        ncal,
                        normalized_odp_bts,
                        trim_float_string(row.get("Level")),
                        normalize_text(row.get("Problem")) or None,
                        technician_id,
                        normalize_text(row.get("Penyebab")) or None,
                        normalize_text(row.get("Action Terakhir")) or None,
                        normalize_text(row.get("Power Before")) or None,
                        normalize_text(row.get("Power After")) or None,
                        classification_id,
                        to_sql_datetime(start_dt),
                        to_sql_datetime(start_dt),
                        to_sql_datetime(end_dt),
                        0,
                        gross_seconds,
                        gross_seconds,
                        importer_user_id,
                        to_sql_datetime(start_dt),
                        to_sql_datetime(end_dt),
                        detail_text,
                        raw_ts or None,
                    ),
                )
                incident_id = connection.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]

                total_pause_seconds, pause_segments, invalid_pause_segments = insert_pause_logs(
                    connection,
                    incident_id,
                    row,
                    start_dt,
                    end_dt,
                )
                nett_seconds = max(gross_seconds - total_pause_seconds, 0)
                connection.execute(
                    """
                    UPDATE incidents
                    SET total_pause_duration_seconds = ?,
                        duration_nett_seconds = ?
                    WHERE id = ?
                    """,
                    (total_pause_seconds, nett_seconds, incident_id),
                )

                insert_audit_logs(
                    connection,
                    incident_id,
                    importer_user_id,
                    technician_id,
                    to_sql_datetime(start_dt),
                    to_sql_datetime(end_dt),
                    to_sql_datetime(update_time),
                    to_sql_datetime(escalation_dt),
                    normalize_text(row.get("Penyebab")) or None,
                    normalize_text(row.get("Action Terakhir")) or None,
                )
            else:
                total_pause_seconds = 0
                pause_segments = []
                invalid_pause_segments = []

            if workbook_duration_seconds is not None and abs(workbook_duration_seconds - gross_seconds) > 60:
                report["duration_mismatches"].append(
                    {
                        "case_no": desired_case_no,
                        "workbook": seconds_to_hms(workbook_duration_seconds),
                        "derived": seconds_to_hms(gross_seconds),
                    }
                )

            if workbook_pause_seconds is not None and abs(workbook_pause_seconds - total_pause_seconds) > 60:
                report["pause_mismatches"].append(
                    {
                        "case_no": desired_case_no,
                        "workbook": seconds_to_hms(workbook_pause_seconds),
                        "derived": seconds_to_hms(total_pause_seconds),
                        "segments": pause_segments,
                    }
                )

            if invalid_pause_segments:
                report["invalid_pause_segments"].append(
                    {
                        "case_no": desired_case_no,
                        "segments": invalid_pause_segments,
                    }
                )

            if workbook_vendor_duration_seconds is not None:
                report.setdefault("vendor_durations", []).append(
                    {
                        "case_no": desired_case_no,
                        "duration": seconds_to_hms(workbook_vendor_duration_seconds),
                    }
                )

            existing_case_nos.add(desired_case_no)
            report["inserted_incidents"] += 1
            if desired_case_no != original_case_no:
                report["duplicate_case_suffixes"].append(
                    {"original": original_case_no, "imported_as": desired_case_no}
                )
            if normalized_odp_bts and raw_odp_bts and normalized_odp_bts != raw_odp_bts.upper():
                report["normalized_infrastructure"].append(
                    {
                        "case_no": desired_case_no,
                        "from": raw_odp_bts,
                        "to": normalized_odp_bts,
                    }
                )

        if apply_changes:
            connection.commit()
        else:
            connection.rollback()
    except Exception:
        if apply_changes:
            connection.rollback()
        raise
    finally:
        report["created_legacy_customers"] = counters["legacy_customer"] - created_customer_ids_before
        report["created_legacy_users"] = counters["legacy_user"] - created_user_ids_before
        report["unmapped_classifications"] = dict(report["unmapped_classifications"])
        report["ncals"] = dict(report["ncals"])
        report["skipped_existing_case_count"] = len(report["skipped_existing_case"])
        report["skipped_invalid_datetime_count"] = len(report["skipped_invalid_datetime"])
        report["duration_mismatch_count"] = len(report["duration_mismatches"])
        report["pause_mismatch_count"] = len(report["pause_mismatches"])
        report["invalid_pause_segment_count"] = len(report["invalid_pause_segments"])
        report["site_placeholders"] = sorted(set(report["site_placeholders"]))
        report["legacy_users"] = sorted(
            row["name"]
            for key, row in users_by_key.items()
            if row["username"].startswith("legacy-")
        )
        connection.close()

    return report


def normalize_existing_imported_infrastructure() -> dict[str, Any]:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    lookup = build_infrastructure_lookup(connection)

    rows = connection.execute(
        """
        SELECT id, case_no, ncal, odp_bts
        FROM incidents
        WHERE detail LIKE ?
          AND odp_bts IS NOT NULL
        """,
        (f"{IMPORT_DETAIL_PREFIX}%",),
    ).fetchall()

    changes = []
    for row in rows:
        normalized = normalize_infrastructure_label(row["odp_bts"], row["ncal"], lookup)
        if normalized and normalized != row["odp_bts"]:
            changes.append((normalized, row["id"], row["case_no"], row["odp_bts"]))

    if changes:
        connection.executemany(
            "UPDATE incidents SET odp_bts = ? WHERE id = ?",
            [(normalized, incident_id) for normalized, incident_id, _case_no, _from_value in changes],
        )
        connection.commit()

    report = {
        "normalized_existing_count": len(changes),
        "changes": [
            {"case_no": case_no, "from": from_value, "to": normalized}
            for normalized, _incident_id, case_no, from_value in changes
        ],
    }
    connection.close()
    return report


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import manual Excel resolved incidents into IMMS history."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write the import into imms.db. Without this flag, the script runs in dry-run mode.",
    )
    parser.add_argument(
        "--workbook",
        default=str(DEFAULT_WORKBOOK_PATH),
        help="Path to the manual workbook to import.",
    )
    parser.add_argument(
        "--report",
        default=str(DEFAULT_REPORT_PATH),
        help="Path to write the JSON import report.",
    )
    parser.add_argument(
        "--normalize-existing-infra",
        action="store_true",
        help="Normalize already imported manual history infrastructure labels to the system format.",
    )
    args = parser.parse_args()

    workbook_path = Path(args.workbook)
    report_path = Path(args.report) if args.report else None

    if args.normalize_existing_infra:
        report = normalize_existing_imported_infrastructure()
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 0

    if not workbook_path.exists():
        print(f"Workbook not found: {workbook_path}", file=sys.stderr)
        return 1

    rows = load_workbook_rows(workbook_path)
    report = import_history(rows, apply_changes=args.apply, workbook_label=workbook_path.name)
    report["workbook_path"] = str(workbook_path)
    if report_path:
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
