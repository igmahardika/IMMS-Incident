export async function geocodePhoton(brand, address) {
  const clean = (str) => {
    if (!str) return '';
    return str
      .replace(/["']/g, '')
      .replace(/rt\s?\d+(\s?\/\s?rw\s?\d+)?/gi, '') // Remove RT/RW
      .replace(/\d{5}/g, '') // Remove Zip codes
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  const b = clean(brand);
  const a = clean(address);

  // Fallback strategies prioritizing Indonesia & Semarang
  const strategies = [
    `${b} ${a}, Indonesia`,
    `${b}, Semarang, Indonesia`,
    `${a}, Semarang, Indonesia`,
    `${b}, Indonesia`,
    a.length > 10 ? `${a}, Indonesia` : null
  ].filter(Boolean);

  for (const query of strategies) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // lat=-6.9667, lon=110.4167 is Semarang
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lat=-6.9667&lon=110.4167`;
        const response = await fetch(url, { headers: { 'User-Agent': 'IMMS-Geocoder' }, signal: AbortSignal.timeout(3000) });
        if (!response.ok) break;
        
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          // Filter for Indonesia specifically (country_code is often in properties)
          const validFeature = data.features.find(f => 
            f.properties.countrycode === 'ID' || 
            f.properties.country === 'Indonesia' ||
            (f.geometry.coordinates[0] > 95 && f.geometry.coordinates[0] < 141 && // Longitude Indonesia
             f.geometry.coordinates[1] > -11 && f.geometry.coordinates[1] < 6)    // Latitude Indonesia
          ) || data.features[0]; // Fallback to first if Indonesia check is inconclusive but coordinates are likely ID

          // Final check: must be in Indonesia bounding box to be valid
          const [lon, lat] = validFeature.geometry.coordinates;
          if (lon < 95 || lon > 141 || lat < -11 || lat > 6) {
             continue; // Skip this strategy result if obviously outside ID
          }

          const props = validFeature.properties;
          
          // Normalize City/Regency Name
          const rawCity = props.county || props.city || props.town || props.city_district || props.state || 'Unknown';
          const city = rawCity
            .replace(/Kabupaten\s?/gi, '')
            .replace(/Kab\.\s?/gi, '')
            .replace(/Kab\s?/gi, '')
            .replace(/Kota\s?/gi, '')
            .replace(/Regency\s?/gi, '')
            .replace(/City\s?/gi, '')
            .replace(/Administrative\s?/gi, '')
            .replace(/Admin\.\s?/gi, '')
            .replace(/DKI\s?/gi, '')
            .replace(/Special Region of\s?/gi, '')
            .replace(/Daerah Khusus Ibukota\s?/gi, '')
            .trim();

          return { lat, lon, city };
        }
        break;
      } catch (e) {
        if (attempt === 2) console.error(`Fetch failed for [${query}]:`, e.message);
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
  return null;
}
