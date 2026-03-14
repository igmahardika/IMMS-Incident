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
      // Find customers with missing coordinates OR missing city
      const targets = db.prepare(`
        SELECT id, company_name, brand_site, address 
        FROM master_customer 
        WHERE (latitude IS NULL OR latitude = 0 OR city IS NULL OR city = '' OR city = 'Unknown') 
        AND address IS NOT NULL AND address != ''
        LIMIT 50
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
            // Mark as failed to avoid retrying indefinitely
            // We'll set coordinates to 0.00001 to mark as "attempted but failed" 
            // so the query doesn't pick it up again immediately
            db.prepare('UPDATE master_customer SET latitude = 0.00001, longitude = 0.00001 WHERE id = ?').run(target.id);
          }
          // Small delay to be polite
          await new Promise(r => setTimeout(r, 100));
        }
      }
    } catch (error) {
      console.error('📡 Geocoder Worker Error:', error.message);
    }

    // Run again in 5 seconds
    setTimeout(processQueue, 5000);
  };

  processQueue();
}
