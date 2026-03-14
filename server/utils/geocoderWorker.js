import db from '../db.js';
import { geocodePhoton } from './geocoder.js';

let isRunning = false;

/**
 * Background worker that looks for customers with missing coordinates
 * and fills them in automatically.
 */
export async function startGeocoderWorker() {
  if (isRunning) return;
  isRunning = true;
  console.log('📡 Geocoder Worker: Started');

  const processQueue = async () => {
    try {
      // Find customers with missing coordinates
      const targets = db.prepare(`
        SELECT id, company_name, brand_site, address 
        FROM master_customer 
        WHERE (latitude IS NULL OR latitude = 0) 
        AND address IS NOT NULL AND address != ''
        LIMIT 10
      `).all();

      if (targets.length > 0) {
        console.log(`📡 Geocoder Worker: Processing ${targets.length} units...`);
        for (const target of targets) {
          const coords = await geocodePhoton(target.brand_site, target.address);
          if (coords) {
            db.prepare('UPDATE master_customer SET latitude = ?, longitude = ?, city = ? WHERE id = ?')
              .run(coords.lat, coords.lon, coords.city, target.id);
            console.log(`   ✅ Synced: ${target.brand_site || target.company_name} (${coords.city})`);
          } else {
            // Mark as failed to avoid retrying indefinitely (optional: can use a specific 'failed' value or retry later)
            // For now, we just skip it in the next loop by not updating it.
          }
          // Small delay to be polite to the API
          await new Promise(r => setTimeout(r, 200));
        }
      }
    } catch (error) {
      console.error('📡 Geocoder Worker Error:', error.message);
    }

    // Run again in 30 seconds
    setTimeout(processQueue, 30000);
  };

  processQueue();
}
