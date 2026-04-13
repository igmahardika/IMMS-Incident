import db from '../db.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Geocoder utility for IMMS
 * Supports multiple providers: Google Maps, Mapbox, and OpenStreetMap (Nominatim)
 */

const CONFIG = {
  provider: process.env.GEOCODER_PROVIDER || 'nominatim',
  googleKey: process.env.GOOGLE_MAPS_KEY,
  mapboxKey: process.env.MAPBOX_KEY,
  minInterval: parseInt(process.env.GEOCODER_INTERVAL || '1000'), // Default 1s
};

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
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const MIN_INTERVAL = Math.max(Number.isFinite(CONFIG.minInterval) ? CONFIG.minInterval : 1000, 750);

function normalizeLocationPart(value) {
  return String(value || '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^,\s*|\s*,$/g, '')
    .trim();
}

function buildQueryCandidates(address, { city, province, country = 'Indonesia' } = {}) {
  const cleanedAddress = smartCleanAddress(address);
  const normalizedCity = normalizeLocationPart(city);
  const normalizedProvince = normalizeLocationPart(province);
  const normalizedCountry = normalizeLocationPart(country);

  const candidates = [
    [cleanedAddress, normalizedCity, normalizedProvince, normalizedCountry].filter(Boolean).join(', '),
    [cleanedAddress, normalizedCity, normalizedCountry].filter(Boolean).join(', '),
    [cleanedAddress, normalizedProvince, normalizedCountry].filter(Boolean).join(', '),
    [cleanedAddress, normalizedCountry].filter(Boolean).join(', '),
    cleanedAddress,
  ]
    .map((candidate) => normalizeLocationPart(candidate))
    .filter(Boolean);

  return [...new Set(candidates)];
}

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

async function geocode(address, options = {}) {
  if (!address) return null;
  const lowerAddr = address.toLowerCase();

  // 1. Try Building Dictionary First (Instant Match)
  for (const [key, coords] of Object.entries(BUILDING_COORDS)) {
    if (lowerAddr.includes(key)) {
      return { 
        latitude: coords.lat, 
        longitude: coords.lon, 
        display_name: `Automated Building Match: ${key.toUpperCase()}` 
      };
    }
  }

  // 2. Choose Provider
  try {
    const queryCandidates = buildQueryCandidates(address, options);

    for (const query of queryCandidates) {
      let found = null;

      if (CONFIG.provider === 'google' && CONFIG.googleKey) found = await geocodeGoogle(query);
      else if (CONFIG.provider === 'mapbox' && CONFIG.mapboxKey) found = await geocodeMapbox(query);
      else found = await geocodeNominatim(query);

      if (found) return found;
    }

    return null;
  } catch (error) {
    console.error(`[Geocoder] Error with ${CONFIG.provider}:`, error.message);
    return null;
  }
}

async function geocodeGoogle(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${CONFIG.googleKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === 'OK' && data.results.length > 0) {
    const loc = data.results[0].geometry.location;
    return { latitude: loc.lat, longitude: loc.lng, display_name: data.results[0].formatted_address };
  }
  return null;
}

async function geocodeMapbox(address) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${CONFIG.mapboxKey}&limit=1`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.features && data.features.length > 0) {
    const [lon, lat] = data.features[0].center;
    return { latitude: lat, longitude: lon, display_name: data.features[0].place_name };
  }
  return null;
}

async function geocodeNominatim(query, retryCount = 0) {
  await waitIfNeeded();
  const encodedQuery = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1`;
  
  const response = await fetch(url, {
    headers: { 'User-Agent': 'IMMS-Internal-Geocoding-Service/1.0' }
  });

  // Lock the time immediately after request
  db.prepare("INSERT INTO metadata (key, value) VALUES ('last_geocoding_time', ?) ON CONFLICT(key) DO UPDATE SET value = ?").run(Date.now().toString(), Date.now().toString());

  if (response.status === 429 && retryCount < 3) {
    const backoff = Math.pow(2, retryCount) * 2000;
    await new Promise(r => setTimeout(r, backoff));
    return geocodeNominatim(query, retryCount + 1);
  }

  if (!response.ok) return null;
  const data = await response.json();
  return data?.[0] ? { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon), display_name: data[0].display_name } : null;
}

export { geocode };
