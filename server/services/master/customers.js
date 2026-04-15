import db from '../../db.js';

export function listCustomers() {
  return db.prepare('SELECT * FROM master_customer ORDER BY company_name').all();
}

export function createCustomer(payload) {
  const {
    customer_id, service_id, company_name, brand_site, address,
    service_type, grade, support_level, link_coverage, sla,
    latitude, longitude, city, province,
  } = payload;

  const result = db.prepare(`
    INSERT INTO master_customer (
      customer_id, service_id, company_name, brand_site, address,
      service_type, grade, support_level, link_coverage, sla,
      latitude, longitude, city, province
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    customer_id,
    service_id,
    company_name,
    brand_site,
    address || null,
    service_type || null,
    grade || null,
    support_level || null,
    link_coverage || null,
    sla || null,
    latitude || null,
    longitude || null,
    city || null,
    province || null
  );

  return db.prepare('SELECT * FROM master_customer WHERE id = ?').get(result.lastInsertRowid);
}

export function batchUpsertCustomers(customers) {
  const insert = db.prepare(`
    INSERT INTO master_customer (
      customer_id, service_id, company_name, brand_site, address,
      service_type, grade, support_level, link_coverage, sla,
      latitude, longitude, city, province
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(customer_id) DO UPDATE SET
      service_id=excluded.service_id,
      company_name=excluded.company_name,
      brand_site=excluded.brand_site,
      address=excluded.address,
      service_type=excluded.service_type,
      grade=excluded.grade,
      support_level=excluded.support_level,
      link_coverage=excluded.link_coverage,
      sla=excluded.sla,
      latitude=excluded.latitude,
      longitude=excluded.longitude,
      city=excluded.city,
      province=excluded.province
  `);

  const insertMany = db.transaction((rows) => {
    let count = 0;
    for (const row of rows) {
      if (!row.customer_id) continue;
      insert.run(
        row.customer_id,
        row.service_id || String(Math.random()),
        row.company_name || '-',
        row.brand_site || '-',
        row.address || null,
        row.service_type || null,
        row.grade || null,
        row.support_level || null,
        row.link_coverage || null,
        row.sla || null,
        row.latitude || null,
        row.longitude || null,
        row.city || null,
        row.province || null
      );
      count++;
    }
    return count;
  });

  return insertMany(customers);
}

export function updateCustomer(id, payload) {
  const {
    customer_id, service_id, company_name, brand_site, address, service_type,
    grade, support_level, link_coverage, is_active, sla, latitude, longitude,
    city, province,
  } = payload;

  db.prepare(`
    UPDATE master_customer SET
      customer_id = COALESCE(?, customer_id),
      service_id = COALESCE(?, service_id),
      company_name = COALESCE(?, company_name),
      brand_site = COALESCE(?, brand_site),
      address = COALESCE(?, address),
      service_type = COALESCE(?, service_type),
      grade = COALESCE(?, grade),
      support_level = COALESCE(?, support_level),
      link_coverage = COALESCE(?, link_coverage),
      sla = COALESCE(?, sla),
      latitude = COALESCE(?, latitude),
      longitude = COALESCE(?, longitude),
      city = COALESCE(?, city),
      province = COALESCE(?, province),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    customer_id ?? null,
    service_id ?? null,
    company_name ?? null,
    brand_site ?? null,
    address ?? null,
    service_type ?? null,
    grade ?? null,
    support_level ?? null,
    link_coverage ?? null,
    sla ?? null,
    latitude ?? null,
    longitude ?? null,
    city ?? null,
    province ?? null,
    is_active ?? null,
    id
  );

  return db.prepare('SELECT * FROM master_customer WHERE id = ?').get(id);
}

export function deactivateCustomer(id) {
  db.prepare('UPDATE master_customer SET is_active = 0 WHERE id = ?').run(id);
  return { success: true };
}
