import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export async function exportToExcel(data, filename = 'IMMS_Report.xlsx') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Incident History');

  // Define Columns
  sheet.columns = [
    { header: 'CASE NO', key: 'case_no', width: 20 },
    { header: 'NCAL', key: 'ncal', width: 10 },
    { header: 'SITE NAME', key: 'brand_site', width: 35 },
    { header: 'ODP / NODE', key: 'odp_bts', width: 25 },
    { header: 'PROBLEM', key: 'initial_problem', width: 40 },
    { header: 'STATUS', key: 'status', width: 15 },
    { header: 'TECHNICIAN', key: 'technician_name', width: 25 },
    { header: 'ROOT CAUSE', key: 'root_cause', width: 40 },
    { header: 'START TIME', key: 'start_time', width: 25 },
    { header: 'END TIME', key: 'end_time', width: 25 },
    { header: 'NETT (SEC)', key: 'duration_nett_seconds', width: 15 },
  ];

  // Styling Header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E1E1E' } // Dark background for professional look
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Adding Data
  data.forEach((item) => {
    const row = sheet.addRow(item);
    
    // Color coding based on NCAL
    const ncalCell = row.getCell('ncal');
    const colors = {
      BLACK: 'FF000000',
      RED: 'FFFF0000',
      ORANGE: 'FFFFA500',
      YELLOW: 'FFFFFF00',
      BLUE: 'FF0000FF'
    };
    if (colors[item.ncal]) {
      ncalCell.font = { color: { argb: colors[item.ncal] }, bold: true };
    }

    // Status formatting
    const statusCell = row.getCell('status');
    if (item.status === 'done') {
       statusCell.font = { color: { argb: 'FF008000' } }; // Green
    }
  });

  // Border and alignment for all cells
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      if (rowNumber > 1) {
        cell.alignment = { vertical: 'middle' };
      }
    });
  });

  // Generate and save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
}
