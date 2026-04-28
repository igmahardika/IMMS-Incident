import { downloadCsv } from './csv.js';
import { formatDuration } from './incidentUtils.js';

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
  { header: 'NETT (HH:MM:SS)', key: 'duration_nett_seconds', width: 18 },
];

const DURATION_EXPORT_KEYS = new Set([
  'duration_nett_seconds',
  'duration_gross_seconds',
  'total_pause_duration_seconds',
]);

export async function exportToCsv(data, filename = 'IMMS_Report.csv') {
  const rows = data.map((item) => EXPORT_COLUMNS.reduce((record, column) => {
    const value = item[column.key];
    record[column.header] = DURATION_EXPORT_KEYS.has(column.key)
      ? formatDuration(value)
      : value ?? '';
    return record;
  }, {}));

  downloadCsv(rows, filename);
}
