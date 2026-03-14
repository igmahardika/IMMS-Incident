import Database from 'better-sqlite3';
import XLSX from 'xlsx';
import path from 'path';

const DB_PATH = '/Users/macbookair/Documents/IMMS/imms.db';
const EXCEL_PATH = '/Users/macbookair/Documents/IMMS/DUMMY/ALAMAT DAN KOORDINAT.xlsx';

const db = new Database(DB_PATH);

// Helper to extract service_id (e.g., "01.0514.1")
function extractServiceId(name) {
  if (!name) return null;
  const match = name.match(/^(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

// Comprehensive list of common cities/provinces for heuristic
const CITIES = [
  'Semarang', 'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Palembang', 
  'Makassar', 'Tegal', 'Pemalang', 'Pekalongan', 'Salatiga', 'Batang',
  'Demak', 'Kendal', 'Purwokerto', 'Banyumas', 'Kudus', 'Jepara', 'Pati',
  'Yogyakarta', 'Solo', 'Surakarta', 'Ungaran', 'Surodadi', 'Boyolali',
  'Sukoharjo', 'Karanganyar', 'Wonogiri', 'Sragen', 'Klaten', 'Magelang',
  'Purworejo', 'Kebumen', 'Cilacap', 'Banjarnegara', 'Purbalingga',
  'Wonosobo', 'Temanggung', 'Blora', 'Rembang', 'Grobogan',
  'Brebes', 'Slawi', 'Comal', 'Kajen', 'Gombong', 'Bumiayu', 'Kebumen',
  'Kroya', 'Majenang', 'Wangon', 'Banjarnegara', 'Bobotsari',
  'Baturaden', 'Purbalingga', 'Randudongkal', 'Petarukan', 'Ulujami',
  'Wiradesa', 'Kedungwuni', 'Kedungwuni', 'Doro', 'Karanganyar', 'Weleri',
  'Kaliwungu', 'Boja', 'Limpung', 'Subah', 'Banyuputih', 'Gringsing',
  'Sayung', 'Karangawen', 'Mranggen', 'Gubug', 'Godong', 'Purwodadi'
];

const PROVINCES = {
  'Jawa Tengah': [
    'Semarang', 'Tegal', 'Pemalang', 'Pekalongan', 'Salatiga', 'Batang', 
    'Demak', 'Kendal', 'Purwokerto', 'Banyumas', 'Kudus', 'Jepara', 'Pati', 
    'Solo', 'Surakarta', 'Ungaran', 'Surodadi', 'Boyolali', 'Sukoharjo', 
    'Karanganyar', 'Wonogiri', 'Sragen', 'Klaten', 'Magelang', 'Purworejo', 
    'Kebumen', 'Cilacap', 'Banjarnegara', 'Purbalingga', 'Wonosobo', 
    'Temanggung', 'Blora', 'Rembang', 'Grobogan', 'Brebes', 'Slawi', 'Comal', 'Kajen'
  ],
  'DI Yogyakarta': ['Yogyakarta'],
  'DKI Jakarta': ['Jakarta'],
  'Jawa Barat': ['Bandung'],
  'Jawa Timur': ['Surabaya'],
  'Sumatera Selatan': ['Palembang'],
  'Sulawesi Selatan': ['Makassar']
};

function getProvince(city) {
  for (const [prov, cities] of Object.entries(PROVINCES)) {
    if (cities.includes(city)) return prov;
  }
  return 'Lainnya';
}

function run() {
  console.log('--- Matching Locations from Excel ---');
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const updateStmt = db.prepare(`
    UPDATE master_customer 
    SET address = @address, 
        latitude = @latitude, 
        longitude = @longitude, 
        city = @city, 
        province = @province
    WHERE service_id = @service_id OR brand_site = @name
  `);

  let matched = 0;
  let total = rows.length;

  db.transaction(() => {
    for (const row of rows) {
      const excelName = String(row['Name'] || '');
      const serviceId = extractServiceId(excelName);
      const address = String(row['Address'] || '');
      
      // Parse coordinates from "Lat,Long" string in Latitude column
      let lat = null, lng = null;
      if (row['Latitude']) {
        const coords = String(row['Latitude']).split(',');
        lat = parseFloat(coords[0]);
        lng = parseFloat(coords[1]);
      }
      
      // Heuristic for city
      let city = 'Lainnya';
      for (const c of CITIES) {
        if (excelName.toLowerCase().includes(c.toLowerCase()) || address.toLowerCase().includes(c.toLowerCase())) {
          city = c;
          break;
        }
      }
      
      const province = getProvince(city);

      const info = updateStmt.run({
        service_id: serviceId,
        name: excelName,
        address: address,
        latitude: lat,
        longitude: lng,
        city: city,
        province: province
      });

      if (info.changes > 0) matched++;
    }
  })();

  console.log(`Matched and Updated: ${matched} / ${total}`);
  
  // Summary count
  const stats = db.prepare('SELECT city, COUNT(*) as count FROM master_customer WHERE latitude IS NOT NULL GROUP BY city').all();
  console.log('Distribution by City:', stats);
}

run();
