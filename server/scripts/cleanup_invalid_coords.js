import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../..', 'imms.db');
const db = new Database(DB_PATH);

console.log('🧹 Cleaning up invalid coordinates (outside Indonesia)...');

// Indonesia bounding box approx: Lon [95, 141], Lat [-11, 6]
const invalidRecords = db.prepare(`
  SELECT id, brand_site, company_name, latitude, longitude, city 
  FROM master_customer 
  WHERE latitude IS NOT NULL AND latitude != 0
  AND (
    longitude < 95 OR longitude > 141 OR 
    latitude < -11 OR latitude > 6 OR
    city = 'Town of Lincoln' OR city = 'Batam' -- Common false positives seen earlier
  )
`).all();

console.log(`🔍 Found ${invalidRecords.length} suspicious records.`);

const reset = db.prepare('UPDATE master_customer SET latitude = NULL, longitude = NULL, city = NULL WHERE id = ?');

const resetAll = db.transaction((records) => {
  for (const r of records) {
    console.log(`   ♻️ Resetting: ${r.brand_site || r.company_name} (Was: ${r.city} at ${r.latitude},${r.longitude})`);
    reset.run(r.id);
  }
});

if (invalidRecords.length > 0) {
  resetAll(invalidRecords);
  console.log('✅ Cleanup complete. These records will be re-geocoded using improved logic.');
} else {
  console.log('✅ No invalid records found.');
}

process.exit(0);
