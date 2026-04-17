#!/usr/bin/env python3

from __future__ import annotations

import json
import re
import shutil
import sqlite3
import sys
import zipfile
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
import xml.etree.ElementTree as ET


WORKBOOK_PATH = Path("MANUAL DATA/UPDATE.xlsx")
REPORT_PATH = Path("MANUAL DATA/update_sync_report.json")
DB_PATH = Path("imms.db")
BACKUP_DIR = Path("/tmp/imms-backups")

NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "p": "http://schemas.openxmlformats.org/package/2006/relationships",
}

ODP_HEADER = ["ODP", "LAT", "LONG"]
CUSTOMER_HEADER = ["NO", "NAME", "OLT", "ODC", "ODP", "ONU Down (Rx)", "OLT Up (Rx)", "Alamat", "Titik Koordinat"]


def normalize_text(value):
    return str(value or "").strip()


def normalize_key(value):
    return re.sub(r"[^a-z0-9]+", "", normalize_text(value).lower())


def col_to_index(col):
    number = 0
    for char in col:
        number = number * 26 + ord(char) - 64
    return number - 1


def ensure_columns(connection, table_name, column_defs):
    existing = {
        row["name"]
        for row in connection.execute(f"PRAGMA table_info({table_name})")
    }
    for column_name, definition in column_defs.items():
        if column_name not in existing:
            connection.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")


def load_sheet_rows(path, target_sheet_name, expected_header):
    with zipfile.ZipFile(path) as archive:
        shared_strings = []
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

        sheet_rel_id = None
        for sheet in workbook.findall("a:sheets/a:sheet", NS):
            if sheet.attrib.get("name") == target_sheet_name:
                sheet_rel_id = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
                break

        if not sheet_rel_id:
            raise ValueError(f'Sheet "{target_sheet_name}" not found in workbook.')

        sheet = ET.fromstring(archive.read(f"xl/{relationship_map[sheet_rel_id]}"))
        rows = []
        for row in sheet.findall(".//a:sheetData/a:row", NS):
            values = []
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

    header = rows[0][: len(expected_header)]
    if header != expected_header:
        raise ValueError(
            f'Unexpected header in sheet "{target_sheet_name}". '
            f'Expected {" | ".join(expected_header)} but found {" | ".join(header)}.'
        )

    result = []
    for row in rows[1:]:
        if not any(normalize_text(value) for value in row):
            continue
        result.append({
            expected_header[index]: normalize_text(row[index] if index < len(row) else "")
            for index in range(len(expected_header))
        })
    return result


def parse_coord_component(component):
    text = normalize_text(component).replace("º", "°")
    if not text:
        return None

    hemisphere_match = re.search(r"([NSEW])", text.upper())
    hemisphere = hemisphere_match.group(1) if hemisphere_match else None

    cleaned = text.replace(" ", "")
    if re.fullmatch(r"[-+]?\d+(?:\.\d+)?°?", cleaned):
        decimal = float(cleaned.replace("°", ""))
        if hemisphere in {"S", "W"}:
            return -abs(decimal)
        if hemisphere in {"N", "E"}:
            return abs(decimal)
        return decimal

    parts = re.findall(r"[-+]?\d+(?:\.\d+)?", text)
    if not parts:
        return None

    sign = -1 if text.startswith("-") or hemisphere in {"S", "W"} else 1
    degrees = abs(float(parts[0]))
    minutes = float(parts[1]) if len(parts) >= 2 else 0.0
    seconds = float(parts[2]) if len(parts) >= 3 else 0.0
    decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
    return round(sign * decimal, 8)


def parse_coordinate_pair(raw_value):
    text = normalize_text(raw_value)
    if not text or text == ",":
        return None

    text = text.replace(";", ",")

    if any(symbol in text.upper() for symbol in ["N", "S", "E", "W", "°", "'"]):
        parts = [part for part in re.split(r"\s*,\s*", text) if part]
        if len(parts) >= 2:
            latitude = parse_coord_component(parts[0])
            longitude = parse_coord_component(parts[1])
            if latitude is not None and longitude is not None:
                return latitude, longitude

    decimal_parts = re.findall(r"[-+]?\d+(?:\.\d+)?", text)
    if len(decimal_parts) >= 2:
        latitude = float(decimal_parts[0])
        longitude = float(decimal_parts[1])
        if abs(latitude) <= 90 and abs(longitude) <= 180:
            return round(latitude, 8), round(longitude, 8)

    return None


def normalize_odp_name(value):
    text = normalize_text(value).upper()
    text = re.sub(r"^ODP\s+", "", text)
    text = text.replace("_", "-")
    text = re.sub(r"\s*-\s*", "-", text)
    text = re.sub(r"\s+", "", text)
    text = re.sub(r"([A-Z]+[0-9]?)([A-Z])(\d{1,2})$", lambda match: f"{match.group(1)}-{match.group(2)}{int(match.group(3)):02d}", text)
    text = re.sub(r"([A-Z]+[0-9]?)-(\d{1,2})$", lambda match: f"{match.group(1)}-{int(match.group(2)):02d}", text)
    return text


def topology_candidate_keys(raw_value):
    normalized = normalize_odp_name(raw_value)
    if not normalized:
        return []

    candidates = [normalized]
    if normalized.startswith("JB-"):
        candidates.append(normalized[3:])
    if normalized.startswith("JB") and len(normalized) > 2 and normalized[2] != "-":
        candidates.append(normalized[2:])
    if normalized.startswith("PND-"):
        candidates.append(normalized[4:])
    if normalized.startswith("PND") and len(normalized) > 3 and normalized[3] != "-":
        candidates.append(normalized[3:])

    deduped = []
    seen = set()
    for item in candidates:
        key = normalize_key(item)
        if not key or key in seen:
            continue
        deduped.append(key)
        seen.add(key)
    return deduped


def resolve_topology_node(lookup, raw_value):
    candidate_keys = topology_candidate_keys(raw_value)
    for index, candidate_key in enumerate(candidate_keys):
        node = lookup.get(candidate_key)
        if node:
            return node, index > 0
    return None, False


def choose_brand_from_name(raw_name, brand_keys_sorted, brand_lookup):
    normalized_name = normalize_key(raw_name)
    if not normalized_name:
        return None

    exact_matches = brand_lookup.get(normalized_name)
    if exact_matches and len(exact_matches) == 1:
        return exact_matches[0]

    suffix_candidates = []
    for brand_key in brand_keys_sorted:
        if len(brand_key) < 5:
            continue
        if normalized_name.endswith(brand_key):
            brand_values = brand_lookup.get(brand_key, [])
            if len(brand_values) == 1:
                suffix_candidates.append((len(brand_key), brand_values[0]))

    if not suffix_candidates:
        return None

    suffix_candidates.sort(key=lambda item: item[0], reverse=True)
    return suffix_candidates[0][1]


def simplify_customer_name(raw_name):
    text = normalize_text(raw_name)
    text = re.sub(r"^((?:\d{2}\.){2}\d+(?:\.\d+)?|\d{4}-\d+)\s+", "", text)
    return re.sub(r"\s+", " ", text).strip(" -")


def prepare_backup():
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    backup_path = BACKUP_DIR / f"imms-before-update-sync-{datetime.now().strftime('%Y%m%d-%H%M%S')}.db"
    shutil.copy2(DB_PATH, backup_path)
    return backup_path


def main():
    if not WORKBOOK_PATH.exists():
        raise FileNotFoundError(f"Workbook not found: {WORKBOOK_PATH}")
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found: {DB_PATH}")

    backup_path = prepare_backup()

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row

    ensure_columns(connection, "master_customer", {
        "osc_reference": "TEXT",
        "odc_reference": "TEXT",
        "odp_reference": "TEXT",
        "survey_name_raw": "TEXT",
        "survey_latitude": "REAL",
        "survey_longitude": "REAL",
        "survey_source": "TEXT",
        "survey_updated_at": "TEXT",
        "coord_source": "TEXT",
        "coord_updated_at": "TEXT",
    })
    ensure_columns(connection, "master_distribusi", {
        "survey_latitude": "REAL",
        "survey_longitude": "REAL",
        "survey_source": "TEXT",
        "survey_updated_at": "TEXT",
        "coord_source": "TEXT",
        "coord_updated_at": "TEXT",
    })

    odp_rows = load_sheet_rows(WORKBOOK_PATH, "ODP", ODP_HEADER)
    customer_rows = load_sheet_rows(WORKBOOK_PATH, "CUSTOMER", CUSTOMER_HEADER)

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    topology_rows = connection.execute(
        """
        SELECT id, type, level_1, level_2, level_3, level_4, latitude, longitude
        FROM master_distribusi
        WHERE is_active = 1 AND level_4 IS NOT NULL
        """
    ).fetchall()
    topology_by_odp = {normalize_key(normalize_odp_name(row["level_4"])): row for row in topology_rows if normalize_odp_name(row["level_4"])}
    osc_lookup = {
        normalize_key(row["level_2"]): row["level_2"]
        for row in topology_rows
        if row["level_2"]
    }
    odc_lookup = {
        normalize_key(row["level_3"]): row["level_3"]
        for row in topology_rows
        if row["level_3"]
    }

    customer_rows_db = connection.execute(
        """
        SELECT id, customer_id, service_id, company_name, brand_site, address, latitude, longitude,
               osc_reference, odc_reference, odp_reference
        FROM master_customer
        WHERE is_active = 1
        """
    ).fetchall()

    address_lookup = defaultdict(list)
    brand_lookup = defaultdict(list)
    brand_address_lookup = defaultdict(list)
    for row in customer_rows_db:
        address_key = normalize_key(row["address"])
        brand_key = normalize_key(row["brand_site"])
        if address_key:
            address_lookup[address_key].append(row)
        if brand_key:
            brand_lookup[brand_key].append(row["brand_site"])
            if address_key:
                brand_address_lookup[f"{brand_key}|{address_key}"].append(row)

    deduped_brand_lookup = {
        key: sorted(set(values))
        for key, values in brand_lookup.items()
    }
    brand_keys_sorted = sorted(deduped_brand_lookup.keys(), key=len, reverse=True)

    odp_coord_sets = defaultdict(set)
    for row in odp_rows:
        key = normalize_key(normalize_odp_name(row["ODP"]))
        latitude = parse_coord_component(row["LAT"])
        longitude = parse_coord_component(row["LONG"])
        if key and latitude is not None and longitude is not None:
            odp_coord_sets[key].add((round(latitude, 8), round(longitude, 8)))

    topology_summary = Counter()
    topology_unmatched = []

    update_topology = connection.execute
    connection.execute("BEGIN")
    try:
        for odp_key, coord_set in odp_coord_sets.items():
            node, resolved_via_alias = resolve_topology_node(topology_by_odp, odp_key)
            if not node:
                topology_unmatched.append(odp_key)
                topology_summary["unmatched"] += 1
                continue
            if resolved_via_alias:
                topology_summary["alias_matched"] += 1

            if len(coord_set) > 1:
                connection.execute(
                    """
                    UPDATE master_distribusi
                    SET survey_latitude = NULL,
                        survey_longitude = NULL,
                        survey_source = NULL,
                        survey_updated_at = NULL
                    WHERE id = ?
                    """,
                    [node["id"]],
                )
                topology_summary["discarded_conflicts"] += 1
                continue

            survey_latitude, survey_longitude = next(iter(coord_set))
            payload = [survey_latitude, survey_longitude, "UPDATE.xlsx:ODP", now]
            set_clauses = [
                "survey_latitude = ?",
                "survey_longitude = ?",
                "survey_source = ?",
                "survey_updated_at = ?",
            ]
            if node["latitude"] is None or node["longitude"] is None:
                set_clauses.extend([
                    "latitude = ?",
                    "longitude = ?",
                    "coord_source = ?",
                    "coord_updated_at = ?",
                ])
                payload.extend([survey_latitude, survey_longitude, "update-workbook-odp", now])
                topology_summary["actual_filled"] += 1
            else:
                topology_summary["survey_only"] += 1

            payload.append(node["id"])
            connection.execute(
                f"UPDATE master_distribusi SET {', '.join(set_clauses)} WHERE id = ?",
                payload,
            )
            topology_summary["matched"] += 1

        customer_updates = {}
        customer_match_modes = Counter()
        customer_unmatched = 0
        customer_unmatched_actionable = 0
        customer_unmatched_external = 0
        customer_actionable_examples = []
        customer_external_examples = []

        for row in customer_rows:
            raw_name = row["NAME"]
            address = row["Alamat"]
            coord_pair = parse_coordinate_pair(row["Titik Koordinat"])
            brand_site = choose_brand_from_name(raw_name, brand_keys_sorted, deduped_brand_lookup)
            brand_key = normalize_key(brand_site)
            address_key = normalize_key(address)

            matched_customer = None
            match_mode = None
            if brand_key and address_key:
                brand_address_matches = brand_address_lookup.get(f"{brand_key}|{address_key}", [])
                if len(brand_address_matches) == 1:
                    matched_customer = brand_address_matches[0]
                    match_mode = "brand_address"
            if matched_customer is None and address_key and len(address_lookup.get(address_key, [])) == 1:
                matched_customer = address_lookup[address_key][0]
                match_mode = "address"
            if matched_customer is None and brand_key:
                brand_matches = [row_db for row_db in customer_rows_db if normalize_key(row_db["brand_site"]) == brand_key]
                if len(brand_matches) == 1:
                    matched_customer = brand_matches[0]
                    match_mode = "brand"

            if matched_customer is None:
                customer_unmatched += 1
                stewardship_reasons = []
                topology_match, _ = resolve_topology_node(topology_by_odp, row["ODP"])
                if topology_match:
                    stewardship_reasons.append("odp")
                elif row["ODC"] and odc_lookup.get(normalize_key(row["ODC"])):
                    stewardship_reasons.append("odc")
                elif row["OLT"] and osc_lookup.get(normalize_key(row["OLT"])):
                    stewardship_reasons.append("osc")
                if address_key and address_lookup.get(address_key):
                    stewardship_reasons.append("address")

                example_payload = {
                    "name": raw_name,
                    "simplified_name": simplify_customer_name(raw_name),
                    "address": address,
                    "odc": row["ODC"],
                    "odp": row["ODP"],
                    "olt": row["OLT"],
                    "has_coordinates": coord_pair is not None,
                    "reasons": stewardship_reasons,
                }

                if stewardship_reasons:
                    customer_unmatched_actionable += 1
                    if len(customer_actionable_examples) < 20:
                        customer_actionable_examples.append(example_payload)
                else:
                    customer_unmatched_external += 1
                    if len(customer_external_examples) < 20:
                        customer_external_examples.append(example_payload)
                continue

            customer_match_modes[match_mode] += 1
            entry = customer_updates.setdefault(matched_customer["id"], {
                "db_row": matched_customer,
                "raw_names": set(),
                "addresses": set(),
                "coords": set(),
                "coord_examples": [],
                "match_modes": Counter(),
                "osc_values": set(),
                "odc_values": set(),
                "odp_values": set(),
            })

            entry["raw_names"].add(raw_name)
            if address:
                entry["addresses"].add(address)
            entry["match_modes"][match_mode] += 1

            if coord_pair:
                entry["coords"].add((round(coord_pair[0], 8), round(coord_pair[1], 8)))
                entry["coord_examples"].append(coord_pair)

            workbook_odp = normalize_odp_name(row["ODP"])
            topology_match, _ = resolve_topology_node(topology_by_odp, workbook_odp)
            if topology_match:
                if topology_match["level_2"]:
                    entry["osc_values"].add(topology_match["level_2"])
                if topology_match["level_3"]:
                    entry["odc_values"].add(topology_match["level_3"])
                if topology_match["level_4"]:
                    entry["odp_values"].add(topology_match["level_4"])
            else:
                if row["OLT"]:
                    osc_value = osc_lookup.get(normalize_key(row["OLT"]))
                    if osc_value:
                        entry["osc_values"].add(osc_value)
                if row["ODC"]:
                    odc_value = odc_lookup.get(normalize_key(row["ODC"]))
                    if odc_value:
                        entry["odc_values"].add(odc_value)
                if workbook_odp:
                    entry["odp_values"].add(f"ODP {workbook_odp}" if not workbook_odp.startswith("ODP ") else workbook_odp)

        customer_summary = Counter()
        for customer_id, entry in customer_updates.items():
            db_row = entry["db_row"]
            set_clauses = []
            payload = []

            preferred_name = sorted(entry["raw_names"])[0] if entry["raw_names"] else None
            if preferred_name:
                set_clauses.append("survey_name_raw = ?")
                payload.append(preferred_name)

            unique_coords = sorted(entry["coords"])
            if len(unique_coords) == 1:
                survey_latitude, survey_longitude = unique_coords[0]
                set_clauses.extend([
                    "survey_latitude = ?",
                    "survey_longitude = ?",
                    "survey_source = ?",
                    "survey_updated_at = ?",
                ])
                payload.extend([survey_latitude, survey_longitude, "UPDATE.xlsx:CUSTOMER", now])
                if db_row["latitude"] is None or db_row["longitude"] is None:
                    set_clauses.extend([
                        "latitude = ?",
                        "longitude = ?",
                        "coord_source = ?",
                        "coord_updated_at = ?",
                    ])
                    payload.extend([survey_latitude, survey_longitude, "update-workbook-customer", now])
                    customer_summary["actual_filled"] += 1
                else:
                    customer_summary["survey_only"] += 1
            elif len(unique_coords) > 1:
                set_clauses.extend([
                    "survey_latitude = NULL",
                    "survey_longitude = NULL",
                    "survey_source = NULL",
                    "survey_updated_at = NULL",
                ])
                customer_summary["discarded_coord_conflicts"] += 1

            if not normalize_text(db_row["address"]) and entry["addresses"]:
                set_clauses.append("address = ?")
                payload.append(sorted(entry["addresses"])[0])
                customer_summary["address_filled"] += 1

            if len(entry["osc_values"]) == 1 and normalize_text(db_row["osc_reference"]) in {"", next(iter(entry["osc_values"]))}:
                set_clauses.append("osc_reference = ?")
                payload.append(next(iter(entry["osc_values"])))
                customer_summary["osc_linked"] += 1
            if len(entry["odc_values"]) == 1 and normalize_text(db_row["odc_reference"]) in {"", next(iter(entry["odc_values"]))}:
                set_clauses.append("odc_reference = ?")
                payload.append(next(iter(entry["odc_values"])))
                customer_summary["odc_linked"] += 1
            if len(entry["odp_values"]) == 1 and normalize_text(db_row["odp_reference"]) in {"", next(iter(entry["odp_values"]))}:
                set_clauses.append("odp_reference = ?")
                payload.append(next(iter(entry["odp_values"])))
                customer_summary["odp_linked"] += 1

            if set_clauses:
                payload.append(customer_id)
                connection.execute(
                    f"UPDATE master_customer SET {', '.join(set_clauses)} WHERE id = ?",
                    payload,
                )
                customer_summary["matched"] += 1

        connection.commit()
    except Exception:
        connection.rollback()
        raise

    report = {
        "workbook": str(WORKBOOK_PATH),
        "generated_at": now,
        "backup_path": str(backup_path),
        "topology": {
            "rows": len(odp_rows),
            "unique_odp": len(odp_coord_sets),
            "matched": topology_summary["matched"],
            "actual_filled": topology_summary["actual_filled"],
            "survey_only": topology_summary["survey_only"],
            "alias_matched": topology_summary["alias_matched"],
            "discarded_conflicts": topology_summary["discarded_conflicts"],
            "unmatched": topology_summary["unmatched"],
            "unmatched_examples": topology_unmatched[:20],
        },
        "customers": {
            "rows": len(customer_rows),
            "matched": customer_summary["matched"],
            "actual_filled": customer_summary["actual_filled"],
            "survey_only": customer_summary["survey_only"],
            "address_filled": customer_summary["address_filled"],
            "osc_linked": customer_summary["osc_linked"],
            "odc_linked": customer_summary["odc_linked"],
            "odp_linked": customer_summary["odp_linked"],
            "discarded_coord_conflicts": customer_summary["discarded_coord_conflicts"],
            "unmatched": customer_unmatched,
            "unmatched_actionable": customer_unmatched_actionable,
            "unmatched_external_only": customer_unmatched_external,
            "unmatched_actionable_examples": customer_actionable_examples,
            "unmatched_external_examples": customer_external_examples,
            "match_modes": dict(customer_match_modes),
        },
    }

    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # pragma: no cover
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
