import db from '../db.js';

// Ensure metadata table exists for global state
db.exec(`
  CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

/**
 * Geocoder utility for IMMS
 * Uses OpenStreetMap Nominatim API with Smart Fallbacks for Buildings
 */

// Major Building Hubs in Semarang for fast fallback
const BUILDING_COORDS = {
  'paragon': { lat: -6.9833, lon: 110.4108 },
  'queen city': { lat: -6.9745, lon: 110.4165 },
  'dp mall': { lat: -6.9845, lon: 110.4140 },
  'ciputra': { lat: -6.9890, lon: 110.4225 },
  'uptown mall': { lat: -7.0345, lon: 110.3540 },
  'ahmad yani': { lat: -6.9530, lon: 110.3735 }, // Airport
  'sim square': { lat: -6.9855, lon: 110.4205 },
  'suara merdeka': { lat: -6.9848, lon: 110.4190 },
  'tentrem': { lat: -6.1132, lon: 106.8400 }, // Fallback if general search fails
  'pinnacle': { lat: -6.9840, lon: 110.4180 },
  'bsb city': { lat: -7.0350, lon: 110.3500 },
  'candi': { lat: -7.0100, lon: 110.3500 }, // Kawasan Industri Candi
};

/**
 * Clears tenant, floor, and unit details to find the main building
 */
function smartCleanAddress(addr) {
  if (!addr) return '';
  return addr
    .replace(/lantai\s*\d+/gi, '')
    .replace(/lt\s*\d+/gi, '')
    .replace(/unit\s*\w+/gi, '')
    .replace(/blok\s*\w+/gi, '')
    .replace(/no\s*\.?\s*\d+/gi, '')
    .replace(/rt\s*\d+/gi, '')
    .replace(/rw\s*\d+/gi, '')
    .replace(/,\s*,/g, ',')
    .trim();
}

// Rate limiting settings
const MIN_INTERVAL = 2000; // 2 seconds between requests

async function waitIfNeeded() {
  let isWaiting = true;
  while (isWaiting) {
    const now = Date.now();
    const row = db.prepare("SELECT value FROM metadata WHERE key = 'last_geocoding_time'").get();
    const lastTime = row ? parseInt(row.value) : 0;
    
    const timeSinceLast = now - lastTime;
    if (timeSinceLast < MIN_INTERVAL) {
      const waitTime = MIN_INTERVAL - timeSinceLast;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    } else {
      // Try to "lock" the time
      const updated = db.prepare("INSERT INTO metadata (key, value) VALUES ('last_geocoding_time', ?) ON CONFLICT(key) DO UPDATE SET value = ? WHERE value = ?").run(now.toString(), now.toString(), lastTime.toString());
      if (updated.changes > 0) {
        isWaiting = false;
      } else {
        // Someone else updated it just now, wait again
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
}

async function geocode(address, retryCount = 0) {
  if (!address) return null;
  
  const lowerAddr = address.toLowerCase();

  // Try Building Dictionary First
  for (const [key, coords] of Object.entries(BUILDING_COORDS)) {
    if (lowerAddr.includes(key)) {
      return { 
        latitude: coords.lat, 
        longitude: coords.lon, 
        display_name: `Automated Building Match: ${key.toUpperCase()}` 
      };
    }
  }

  try {
    await waitIfNeeded();

    const cleaned = smartCleanAddress(address);
    const query = encodeURIComponent(`${cleaned}, Jawa Tengah, Indonesia`);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'IMMS-Internal-Geocoding-Service/1.0 (contact: fitroh.abdilah@imms.local)'
      }
    });

    // Update time again after response to ensure interval starts AFTER request finishing
    db.prepare("INSERT INTO metadata (key, value) VALUES ('last_geocoding_time', ?) ON CONFLICT(key) DO UPDATE SET value = ?").run(Date.now().toString(), Date.now().toString());

    if (response.status === 429) {
      if (retryCount < 3) {
        const backoff = Math.pow(2, retryCount) * 2000;
        console.warn(`[Geocoder] Rate limited (429). Retrying in ${backoff}ms... (Attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return geocode(address, retryCount + 1);
      }
      throw new Error('Rate limit exceeded after multiple retries');
    }

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Geocoding failed for [${address}]:`, error.message);
    return null;
  }
}

export { geocode };
