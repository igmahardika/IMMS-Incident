import db from '../../db.js';
import { buildQueryCandidates, geocode, inspectCache } from '../../utils/geocoder.js';
import { looksLikeInternalTopologyLabel, normalizeIds, normalizeInfraLabel } from './utils.js';

export function listCustomersMissingCoords() {
  return db.prepare(`
    SELECT id, company_name, brand_site, address, city, province
    FROM master_customer
    WHERE COALESCE(is_active, 1) = 1
      AND (latitude IS NULL OR longitude IS NULL)
      AND address IS NOT NULL
      AND TRIM(address) <> ''
  `).all();
}

export function getCustomerGeocodeReport() {
  const totals = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) AS mapped,
      SUM(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 ELSE 0 END) AS missing,
      SUM(CASE WHEN (latitude IS NULL OR longitude IS NULL) AND address IS NOT NULL AND TRIM(address) <> '' THEN 1 ELSE 0 END) AS address_ready,
      SUM(CASE WHEN (latitude IS NULL OR longitude IS NULL) AND (address IS NULL OR TRIM(address) = '') THEN 1 ELSE 0 END) AS missing_address
    FROM master_customer
    WHERE COALESCE(is_active, 1) = 1
  `).get();

  const provinceBreakdown = db.prepare(`
    SELECT
      COALESCE(NULLIF(TRIM(province), ''), 'Unknown') AS province,
      COUNT(*) AS count
    FROM master_customer
    WHERE COALESCE(is_active, 1) = 1
      AND (latitude IS NULL OR longitude IS NULL)
    GROUP BY province
    ORDER BY count DESC, province ASC
    LIMIT 6
  `).all();

  const rawSamples = db.prepare(`
    SELECT id, brand_site, company_name, city, province, address
    FROM master_customer
    WHERE COALESCE(is_active, 1) = 1
      AND (latitude IS NULL OR longitude IS NULL)
    ORDER BY
      CASE WHEN address IS NULL OR TRIM(address) = '' THEN 0 ELSE 1 END DESC,
      COALESCE(created_at, customer_id) DESC
    LIMIT 8
  `).all();

  let cachedMiss = 0;
  const samples = rawSamples.map((item) => {
    if (!(item.address && String(item.address).trim())) {
      return { ...item, reason: 'missing_address' };
    }

    const candidates = buildQueryCandidates(item.address, { city: item.city, province: item.province });
    const cacheStates = candidates.map((query) => inspectCache(query).status);
    const isCachedMiss = cacheStates.length > 0 && cacheStates.every((status) => status === 'miss');
    if (isCachedMiss) cachedMiss += 1;

    return {
      ...item,
      reason: isCachedMiss ? 'cached_miss' : 'ready_to_sync',
    };
  });

  return {
    total: Number(totals.total || 0),
    mapped: Number(totals.mapped || 0),
    missing: Number(totals.missing || 0),
    addressReady: Number(totals.address_ready || 0),
    readyToSync: Math.max(Number(totals.address_ready || 0) - cachedMiss, 0),
    missingAddress: Number(totals.missing_address || 0),
    cachedMiss,
    provinceBreakdown,
    samples: samples.slice(0, 8),
  };
}

export async function autoGeocodeCustomers(ids) {
  const normalizedIds = normalizeIds(ids);
  if (!normalizedIds.length) {
    const error = new Error('Invalid IDs');
    error.status = 400;
    throw error;
  }

  const placeholders = normalizedIds.map(() => '?').join(', ');
  const items = db.prepare(`SELECT * FROM master_customer WHERE COALESCE(is_active, 1) = 1 AND id IN (${placeholders})`).all(...normalizedIds);
  const updateStmt = db.prepare('UPDATE master_customer SET latitude = ?, longitude = ? WHERE id = ?');
  const memo = new Map();
  const results = [];

  for (const customer of items) {
    const baseAddress = String(customer.address || '').trim();
    if (!baseAddress) {
      results.push({ id: customer.id, success: false, reason: 'missing_address' });
      continue;
    }

    const queryCandidates = buildQueryCandidates(baseAddress, {
      city: customer.city,
      province: customer.province,
    });
    const allCachedMiss = queryCandidates.length > 0 && queryCandidates.every((query) => inspectCache(query).status === 'miss');
    if (allCachedMiss) {
      results.push({ id: customer.id, success: false, reason: 'cached_miss' });
      continue;
    }

    const queryKey = JSON.stringify(queryCandidates);

    let found = memo.get(queryKey);
    if (found === undefined) {
      found = await geocode(baseAddress, { city: customer.city, province: customer.province });
      memo.set(queryKey, found || null);
    }

    if (found) {
      updateStmt.run(found.latitude, found.longitude, customer.id);
      results.push({ id: customer.id, success: true, ...found });
    } else {
      results.push({ id: customer.id, success: false, reason: 'not_found' });
    }
  }

  const updated = results.filter((result) => result.success).length;
  const skipped = results.filter((result) => result.reason === 'missing_address').length;
  const cachedMiss = results.filter((result) => result.reason === 'cached_miss').length;
  const failed = results.length - updated - skipped - cachedMiss;
  const cached = results.filter((result) => result.source === 'cache').length;
  const geocoded = updated - cached;
  const remaining = db.prepare(`
    SELECT COUNT(*) AS c
    FROM master_customer
    WHERE COALESCE(is_active, 1) = 1
      AND (latitude IS NULL OR longitude IS NULL)
  `).get().c;

  return {
    success: true,
    total: results.length,
    updated,
    geocoded,
    cached,
    failed,
    skipped,
    cachedMiss,
    remaining,
    results,
    requested: normalizedIds.length,
  };
}

function deriveDistributionCoordinates(item) {
  const candidates = [item.level_4, item.level_3, item.level_2, item.level_1]
    .map(normalizeInfraLabel)
    .filter(Boolean);

  const statement = db.prepare(`
    SELECT
      AVG(c.latitude) AS latitude,
      AVG(c.longitude) AS longitude,
      COUNT(*) AS anchors
    FROM incidents i
    JOIN master_customer c ON c.id = i.customer_id
    WHERE c.latitude IS NOT NULL
      AND c.longitude IS NOT NULL
      AND UPPER(TRIM(i.odp_bts)) = ?
  `);

  for (const label of candidates) {
    const row = statement.get(label);
    if (row?.anchors) {
      return {
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        display_name: `Derived from ${row.anchors} anchored customer incident${row.anchors === 1 ? '' : 's'}`,
        source: 'incident-anchor',
        anchors: Number(row.anchors),
        matched_label: label,
      };
    }
  }

  return null;
}

function classifyDistribusiGeocodeReadiness(item) {
  const locationTerms = item.type === 'Fiber Optic'
    ? [item.level_4, item.level_3, item.level_2, item.level_1]
    : [item.level_1, item.level_2];

  const query = locationTerms.filter((term) => term && term.length >= 3).join(', ');
  if (!query) {
    return { reason: 'missing_location', anchor: null };
  }

  const derived = deriveDistributionCoordinates(item);
  if (derived) {
    return { reason: 'anchorable', anchor: derived };
  }

  const hasRealAddressContext = locationTerms.some((term) => term && !looksLikeInternalTopologyLabel(term));
  if (!hasRealAddressContext) {
    return { reason: 'no_coordinate_anchor', anchor: null };
  }

  return { reason: 'geocode_candidate', anchor: null };
}

export function listDistribusiMissingCoords() {
  return db.prepare(`
    SELECT id, type, level_1, level_2, level_3, level_4
    FROM master_distribusi
    WHERE latitude IS NULL OR longitude IS NULL
  `).all();
}

export function getDistribusiGeocodeReport() {
  const items = db.prepare(`
    SELECT id, type, level_1, level_2, level_3, level_4, latitude, longitude, is_active
    FROM master_distribusi
    WHERE is_active = 1
  `).all();

  let mapped = 0;
  let missing = 0;
  let anchorable = 0;
  let geocodeCandidate = 0;
  let noCoordinateAnchor = 0;
  let missingLocation = 0;

  const samples = [];

  for (const item of items) {
    const hasCoords = item.latitude != null && item.longitude != null;
    if (hasCoords) {
      mapped += 1;
      continue;
    }

    missing += 1;
    const readiness = classifyDistribusiGeocodeReadiness(item);
    if (readiness.reason === 'anchorable') anchorable += 1;
    if (readiness.reason === 'geocode_candidate') geocodeCandidate += 1;
    if (readiness.reason === 'no_coordinate_anchor') noCoordinateAnchor += 1;
    if (readiness.reason === 'missing_location') missingLocation += 1;

    if (samples.length < 8) {
      samples.push({
        id: item.id,
        type: item.type,
        level_1: item.level_1,
        level_2: item.level_2,
        level_3: item.level_3,
        level_4: item.level_4,
        reason: readiness.reason,
      });
    }
  }

  const typeBreakdown = db.prepare(`
    SELECT
      type,
      COUNT(*) AS total,
      SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) AS mapped,
      SUM(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 ELSE 0 END) AS missing
    FROM master_distribusi
    WHERE is_active = 1
    GROUP BY type
    ORDER BY type ASC
  `).all();

  return {
    total: items.length,
    mapped,
    missing,
    anchorable,
    geocodeCandidate,
    noCoordinateAnchor,
    missingLocation,
    typeBreakdown,
    samples,
  };
}

export async function autoGeocodeDistribusi(ids) {
  const normalizedIds = normalizeIds(ids);
  if (!normalizedIds.length) {
    const error = new Error('Invalid IDs');
    error.status = 400;
    throw error;
  }

  const placeholders = normalizedIds.map(() => '?').join(', ');
  const items = db.prepare(`SELECT * FROM master_distribusi WHERE id IN (${placeholders})`).all(...normalizedIds);
  const updateStmt = db.prepare('UPDATE master_distribusi SET latitude = ?, longitude = ? WHERE id = ?');
  const results = [];

  for (const item of items) {
    const derived = deriveDistributionCoordinates(item);
    if (derived) {
      updateStmt.run(derived.latitude, derived.longitude, item.id);
      results.push({ id: item.id, success: true, ...derived });
      continue;
    }

    const readiness = classifyDistribusiGeocodeReadiness(item);
    if (readiness.reason === 'missing_location' || readiness.reason === 'no_coordinate_anchor') {
      results.push({ id: item.id, success: false, reason: readiness.reason });
      continue;
    }

    const locationTerms = item.type === 'Fiber Optic'
      ? [item.level_4, item.level_3, item.level_2, item.level_1]
      : [item.level_1, item.level_2];
    const query = locationTerms.filter((term) => term && term.length >= 3).join(', ');

    const found = await geocode(query, { city: 'Semarang', province: 'Jawa Tengah' });
    if (found) {
      updateStmt.run(found.latitude, found.longitude, item.id);
      results.push({ id: item.id, success: true, ...found });
    } else {
      results.push({ id: item.id, success: false, reason: 'not_found' });
    }
  }

  const updated = results.filter((result) => result.success).length;
  const skipped = results.filter((result) => ['missing_location', 'no_coordinate_anchor'].includes(result.reason)).length;
  const failed = results.length - updated - skipped;
  const derived = results.filter((result) => result.source === 'incident-anchor').length;
  const cached = results.filter((result) => result.source === 'cache').length;
  const geocoded = updated - derived - cached;
  const remaining = db.prepare(`
    SELECT COUNT(*) AS c
    FROM master_distribusi
    WHERE is_active = 1
      AND (latitude IS NULL OR longitude IS NULL)
  `).get().c;

  return { success: true, total: results.length, updated, derived, geocoded, cached, failed, skipped, remaining, results, requested: normalizedIds.length };
}
