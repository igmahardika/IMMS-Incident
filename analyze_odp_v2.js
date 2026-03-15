
import * as xlsx from './node_modules/xlsx/xlsx.mjs';
import fs from 'fs';

const filePath = './DUMMY/KOORDINAT ODP.xlsx';
try {
    const buf = fs.readFileSync(filePath);
    const wb = xlsx.read(buf);
    const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    console.log('Total rows:', data.length);
    console.log('Sample:', JSON.stringify(data.slice(0, 3), null, 2));
} catch (e) {
    console.error('Error:', e.message);
}
