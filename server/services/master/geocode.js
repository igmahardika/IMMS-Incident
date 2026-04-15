import db from '../../db.js';
import { geocode } from '../../utils/geocoder.js';
import { looksLikeInternalTopologyLabel, normalizeIds, normalizeInfraLabel } from './utils.js';

export function listCustomersMissingCoords() {
  return db.prepare(`
    SELECT id, company_name, brand_site, address, city, province
    FROM master_customer
    WHERE (latitude IS NULL OR longitude IS NULL)
      AND address IS NOT NULL
      AND TRIM(address) <> ''
  `).all();
}

export async function autoGeocodeCustomers(ids) {
  const normalizedIds = normalizeIds(ids);
  if (!normalizedIds.length) {
    const error = new Error('Invalid IDs');
    error.status = 400;
    throw error;
  }

  const placeholders = normalizedIds.map(() => '?').join(', ');
  const items = db.prepare(`SELECT * FROM master_customer WHERE id IN (${placeholders})`).all(...normalizedIds);
  const updateStmt = db.prepare('UPDATE master_customer SET latitude = ?, longitude = ? WHERE id = ?');
  const memo = new Map();
  const results = [];

  for (const customer of items) {
    const baseAddress = String(customer.address || '').trim();
    if (!baseAddress) {
      results.push({ id: customer.id, success: false, reason: 'missing_address' });
      continue;
    }

    const queryKey = JSON.stringify({
      address: baseAddress,
      city: String(customer.city || '').trim(),
      province: String(customer.province || '').trim(),
    });

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
  const failed = results.length - updated - skipped;
  const cached = results.filter((result) => result.source === 'cache').length;
  const geocoded = updated - cached;
  const remaining = db.prepare(`
    SELECT COUNT(*) AS c
    FROM master_customer
    WHERE latitude IS NULL OR longitude IS NULL
  `).get().c;

  return { success: true, total: results.length, updated, geocoded, cached, failed, skipped, remaining, results, requested: normalizedIds.length };
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

export function listDistribusiMissingCoords() {
  return db.prepare(`
    SELECT id, type, level_1, level_2, level_3, level_4
    FROM master_distribusi
    WHERE latitude IS NULL OR longitude IS NULL
  `).all();
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

    const locationTerms = item.type === 'Fiber Optic'
      ? [item.level_4, item.level_3, item.level_2, item.level_1]
      : [item.level_1, item.level_2];

    const query = locationTerms.filter((term) => term && term.length >= 3).join(', ');
    if (!query) {
      results.push({ id: item.id, success: false, reason: 'missing_location' });
      continue;
    }

    const hasRealAddressContext = locationTerms.some((term) => term && !looksLikeInternalTopologyLabel(term));
    if (!hasRealAddressContext) {
      results.push({ id: item.id, success: false, reason: 'no_coordinate_anchor' });
      continue;
    }

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
