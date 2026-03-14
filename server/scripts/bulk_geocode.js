import db from '../db.js';
import { geocodePhoton } from '../utils/geocoder.js';

async function bulkGeocode() {
  const batchSize = 100;
  console.log(`🚀 Starting bulk geocoding (${batchSize} units)...`);
  
  const targets = db.prepare(`
    SELECT id, company_name, brand_site, address 
    FROM master_customer 
    WHERE (latitude IS NULL OR latitude = 0) 
    AND address IS NOT NULL AND address != ''
    LIMIT ?
  `).all(batchSize);

  if (targets.length === 0) {
    console.log('✅ No pending targets found.');
    return;
  }

  let successCount = 0;
  for (const target of targets) {
    const coords = await geocodePhoton(target.brand_site, target.address);
    if (coords) {
      db.prepare('UPDATE master_customer SET latitude = ?, longitude = ?, city = ? WHERE id = ?')
        .run(coords.lat, coords.lon, coords.city, target.id);
      successCount++;
      process.stdout.write('.');
    } else {
      process.stdout.write('x');
    }
    await new Promise(r => setTimeout(r, 100)); // Be polite to API
  }

  console.log(`\n✅ Bulk Sync Complete: ${successCount}/${targets.length} units geocoded.`);
  process.exit(0);
}

bulkGeocode().catch(err => {
  console.error('❌ Bulk Sync Failed:', err);
  process.exit(1);
});
