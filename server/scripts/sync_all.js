import Database from 'better-sqlite3';
import { geocode } from './server/utils/geocoder.js';

const db = new Database('imms.db');

async function run() {
  const targets = db.prepare("SELECT id, brand_site, address FROM master_customer WHERE (latitude IS NULL OR latitude = 0)").all();
  console.log(`Processing ${targets.length} targets...`);
  for (const t of targets) {
    const searchQuery = `${t.brand_site || ''} ${t.address || ''}`.trim();
    if (!searchQuery) continue;
    
    const query = searchQuery.toLowerCase().includes('semarang') ? searchQuery : `${searchQuery}, Semarang`;
    const coords = await geocode(query);
    
    if (coords) {
      db.prepare("UPDATE master_customer SET latitude = ?, longitude = ? WHERE id = ?").run(coords.latitude, coords.longitude, t.id);
      console.log(`✅ ${t.brand_site}`);
    } else {
      console.log(`❌ Failed: ${t.brand_site}`);
    }
  }
}

run().then(() => {
  console.log('Done');
  db.close();
});
