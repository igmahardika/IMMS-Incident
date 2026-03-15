
import * as xlsx from './node_modules/xlsx/xlsx.mjs';
import fs from 'fs';
import db from './server/db.js';

function dmsToDecimal(dmsStr) {
    if (!dmsStr || typeof dmsStr !== 'string') return null;
    try {
        // Handle format: 6° 59.217'S
        const match = dmsStr.match(/(\d+)°\s*([\d.]+)'\s*([NSEW])/);
        if (!match) return null;
        
        const degrees = parseFloat(match[1]);
        const minutes = parseFloat(match[2]);
        const direction = match[3];
        
        let decimal = degrees + (minutes / 60);
        if (direction === 'S' || direction === 'W') {
            decimal = -decimal;
        }
        return decimal;
    } catch (e) {
        return null;
    }
}

const filePath = './DUMMY/KOORDINAT ODP.xlsx';
try {
    const buf = fs.readFileSync(filePath);
    const wb = xlsx.read(buf);
    const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    
    console.log(`Processing ${data.length} rows from Excel...`);
    
    const updateStmtExact = db.prepare("UPDATE master_distribusi SET latitude = ?, longitude = ? WHERE type = 'Fiber Optic' AND level_4 = ?");
    const updateStmtPrefix = db.prepare("UPDATE master_distribusi SET latitude = ?, longitude = ? WHERE type = 'Fiber Optic' AND level_4 = 'ODP ' || ?");
    
    let matched = 0;
    let skipped = 0;
    
    const sync = db.transaction((rows) => {
        for (const row of rows) {
            const odpName = row['ODP'];
            const latStr = row['LAT'];
            const longStr = row['LONG'];
            
            if (!odpName) continue;
            
            const lat = dmsToDecimal(latStr);
            const lon = dmsToDecimal(longStr);
            
            if (lat !== null && lon !== null) {
                // Try exact match first
                let info = updateStmtExact.run(lat, lon, odpName);
                if (info.changes === 0) {
                    // Try with ODP prefix
                    info = updateStmtPrefix.run(lat, lon, odpName);
                }

                if (info.changes > 0) {
                    matched++;
                } else {
                    skipped++;
                }
            }
        }
    });
    
    sync(data);
    
    console.log('--- Sync Completed ---');
    console.log('Matched & Updated:', matched);
    console.log('Skipped (No match in DB):', skipped);
    
} catch (e) {
    console.error('Final Error:', e.message);
}
