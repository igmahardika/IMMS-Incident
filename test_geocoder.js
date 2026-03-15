import { geocode } from './server/utils/geocoder.js';

async function test() {
  console.log('--- Testing Geocoder Rate Limiting ---');
  const addresses = [
    'Simpang Lima Semarang',
    'Tugu Muda Semarang',
    'Lawang Sewu',
    'Kota Lama Semarang'
  ];

  for (const addr of addresses) {
    console.log(`[${new Date().toLocaleTimeString()}] Geocoding: ${addr}`);
    const res = await geocode(addr);
    console.log(`[${new Date().toLocaleTimeString()}] Result:`, res?.display_name || 'Failed');
  }
}

test();
