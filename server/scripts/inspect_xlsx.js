
import XLSX from 'xlsx';
import fs from 'fs';

function inspect(filePath) {
  console.log(`--- Inspecting ${filePath} ---`);
  if (!fs.existsSync(filePath)) {
    console.log('File not found');
    return;
  }
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  if (data.length > 0) {
    console.log('Headers:', Object.keys(data[0]));
    console.log('Sample Row:', data[0]);
  } else {
    console.log('File is empty or has no data rows');
  }
}

inspect('/Users/macbookair/Documents/IMMS/DUMMY/KOORDINAT ODP.xlsx');
inspect('/Users/macbookair/Documents/IMMS/DUMMY/ALAMAT DAN KOORDINAT.xlsx');
