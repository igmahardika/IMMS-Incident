import * as XLSX from 'xlsx';

const EXPORT_COLUMNS = [
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

export async function exportToExcel(data, filename = 'IMMS_Report.xlsx') {
  const rows = data.map(item => EXPORT_COLUMNS.reduce((record, column) => {
    record[column.header] = item[column.key] ?? '';
    return record;
  }, {}));

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: EXPORT_COLUMNS.map(column => column.header),
  });

  worksheet['!cols'] = EXPORT_COLUMNS.map(column => ({ wch: column.width }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Incident History');
  XLSX.writeFile(workbook, filename);
}
