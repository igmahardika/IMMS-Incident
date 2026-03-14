/**
 * High-speed geocoding using Photon (Komoot) API.
 * Much faster than Nominatim and allows for higher request rates.
 */
export async function geocodePhoton(brand, address) {
  try {
    const searchQuery = `${brand || ''} ${address || ''}`.trim();
    if (!searchQuery) return null;

    // Improve context if not explicit
    const query = searchQuery.toLowerCase().includes('semarang') ? searchQuery : `${searchQuery}, Semarang`;
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'IMMS-Geocoder-Server' }
    });

    if (!response.ok) throw new Error(`Photon status: ${response.status}`);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lon, lat] = data.features[0].geometry.coordinates;
      return { lat, lon };
    }
  } catch (error) {
    console.error(`Geocoding failed for [${brand}]:`, error.message);
  }
  return null;
}
