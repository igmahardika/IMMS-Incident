import Database from 'better-sqlite3';
import { geocode } from '../utils/geocoder.js';
import dotenv from 'dotenv';
dotenv.config();

const db = new Database('imms.db');
const CONCURRENCY = parseInt(process.env.GEOCODER_CONCURRENCY || '5');

async function processBatch(targets) {
  return Promise.all(targets.map(async (t) => {
    const searchQuery = `${t.brand_site || ''} ${t.address || ''}`.trim();
    if (!searchQuery) return;
    
    const query = searchQuery.toLowerCase().includes('semarang') ? searchQuery : `${searchQuery}, Semarang`;
    const coords = await geocode(query);
    
    if (coords) {
      db.prepare("UPDATE master_customer SET latitude = ?, longitude = ? WHERE id = ?").run(coords.latitude, coords.longitude, t.id);
      console.log(`✅ [${t.id}] ${t.brand_site}`);
    } else {
      console.log(`❌ [${t.id}] Failed: ${t.brand_site}`);
    }
  }));
}

async function run() {
  const targets = db.prepare("SELECT id, brand_site, address FROM master_customer WHERE (latitude IS NULL OR latitude = 0)").all();
  console.log(`🚀 Starting sync for ${targets.length} targets with concurrency ${CONCURRENCY}...`);
  
  const startTime = Date.now();
  
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    await processBatch(batch);
    const progress = Math.min(100, Math.round(((i + batch.length) / targets.length) * 100));
    console.log(`📊 Progress: ${progress}%`);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✨ Done in ${duration}s`);
}

run().catch(console.error).finally(() => db.close());
