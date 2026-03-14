import Database from 'better-sqlite3';
const db = new Database('imms.db');

async function geocodePhoton(brand, address) {
  try {
    const searchQuery = `${brand || ''} ${address || ''}`.trim();
    if (!searchQuery) return null;
    const query = searchQuery.toLowerCase().includes('semarang') ? searchQuery : `${searchQuery}, Semarang`;
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [lon, lat] = data.features[0].geometry.coordinates;
      return { lat, lon };
    }
  } catch (e) {}
  return null;
}

async function run() {
  const targets = db.prepare("SELECT id, brand_site, address FROM master_customer WHERE (latitude IS NULL OR latitude = 0)").all();
  console.log(`Processing ${targets.length} targets...`);
  for (const t of targets) {
    const coords = await geocodePhoton(t.brand_site, t.address);
    if (coords) {
      db.prepare("UPDATE master_customer SET latitude = ?, longitude = ? WHERE id = ?").run(coords.lat, coords.lon, t.id);
      console.log(`✅ ${t.brand_site}`);
    }
    await new Promise(r => setTimeout(r, 100)); // Photon is fast, so 100ms is fine
  }
}

run().then(() => console.log('Done'));
