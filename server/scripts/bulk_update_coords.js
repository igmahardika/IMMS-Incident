
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import Database from 'better-sqlite3';

const db = new Database('/Users/macbookair/Documents/IMMS/imms.db');

function dmsToDecimal(dmsStr) {
  if (!dmsStr) return null;
  if (typeof dmsStr === 'number') return dmsStr;
  if (typeof dmsStr !== 'string') return null;
  
  const regex = /(\d+)°\s*([\d.]+)'\s*([NSEW])/i;
  const match = dmsStr.match(regex);
  if (!match) return parseFloat(dmsStr.replace(/[^\d.-]/g, ''));

  const degrees = parseFloat(match[1]);
  const minutes = parseFloat(match[2]);
  const direction = match[3].toUpperCase();

  let decimal = degrees + (minutes / 60);
  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }
  return decimal;
}

function normalize(str) {
  if (!str) return '';
  return str.toString().toLowerCase()
    .replace(/^odp\s+/i, '')
    .replace(/^odc\s+/i, '')
    .replace(/^osc\s+/i, '')
    .replace(/^\d+\.\d+\.\d+\s+/i, '') // Strip code prefixes like 01.0514.1
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

const distribusiCache = db.prepare('SELECT id, level_4, level_2 FROM master_distribusi').all().map(row => ({
  id: row.id,
  norm4: normalize(row.level_4),
  norm2: normalize(row.level_2)
}));

const customerCache = db.prepare('SELECT id, company_name, brand_site FROM master_customer').all().map(row => ({
  id: row.id,
  normCompany: normalize(row.company_name),
  normBrand: normalize(row.brand_site),
  fullName: row.company_name
}));

function updateDistribusiNodes() {
  console.log('--- Updating Distribution Nodes ---');
  const filePath = '/Users/macbookair/Documents/IMMS/DUMMY/KOORDINAT ODP.xlsx';
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    return;
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  console.log(`Read ${data.length} rows from ${filePath}`);

  const updateStmt = db.prepare('UPDATE master_distribusi SET latitude = ?, longitude = ? WHERE id = ?');
  
  let updatedCount = 0;
  db.transaction(() => {
    for (const row of data) {
      const name = row.ODP;
      const normName = normalize(name);
      const lat = dmsToDecimal(row.LAT);
      const lng = dmsToDecimal(row.LONG);

      if (normName && lat && lng) {
        const found = distribusiCache.find(d => d.norm4 === normName || d.norm2 === normName);
        if (found) {
          const info = updateStmt.run(lat, lng, found.id);
          updatedCount += info.changes;
        }
      }
    }
  })();

  console.log(`Updated ${updatedCount} distribution nodes.`);
}

function updateCustomerNodes() {
  console.log('\n--- Updating Customer Nodes ---');
  const filePath = '/Users/macbookair/Documents/IMMS/DUMMY/ALAMAT DAN KOORDINAT.xlsx';
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    return;
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  console.log(`Read ${data.length} rows from ${filePath}`);

  const updateStmt = db.prepare('UPDATE master_customer SET latitude = ?, longitude = ? WHERE id = ?');
  
  let updatedCount = 0;
  db.transaction(() => {
    for (const row of data) {
      const name = row.Name;
      const normName = normalize(name);
      let lat = null;
      let lng = null;

      if (typeof row.Latitude === 'string' && row.Latitude.includes(',')) {
        const parts = row.Latitude.split(',');
        lat = parseFloat(parts[0]);
        lng = parseFloat(parts[1]);
      } else {
        lat = parseFloat(row.Latitude);
        lng = parseFloat(row.Longitude);
      }

      if (normName && !isNaN(lat) && !isNaN(lng)) {
        // Try exact match first
        let found = customerCache.find(c => c.normCompany === normName || c.normBrand === normName);
        
        // If not found, try inclusion
        if (!found) {
            found = customerCache.find(c => c.normCompany.includes(normName) || normName.includes(c.normCompany));
        }

        if (found) {
          const info = updateStmt.run(lat, lng, found.id);
          updatedCount += info.changes;
        }
      }
    }
  })();

  console.log(`Updated ${updatedCount} customers.`);
}

try {
  updateDistribusiNodes();
  updateCustomerNodes();
} catch (err) {
  console.error('Error during update:', err);
} finally {
  db.close();
}
