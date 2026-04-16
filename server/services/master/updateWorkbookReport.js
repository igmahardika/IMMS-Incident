import fs from 'fs';
import path from 'path';

const REPORT_PATH = path.join(process.cwd(), 'MANUAL DATA', 'update_sync_report.json');

export function getUpdateWorkbookSyncReport() {
  if (!fs.existsSync(REPORT_PATH)) {
    return {
      available: false,
      reportPath: REPORT_PATH,
      customer: null,
      topology: null,
    };
  }

  const raw = fs.readFileSync(REPORT_PATH, 'utf-8');
  const report = JSON.parse(raw);

  return {
    available: true,
    reportPath: REPORT_PATH,
    generatedAt: report.generated_at || null,
    backupPath: report.backup_path || null,
    workbook: report.workbook || null,
    customer: report.customers || null,
    topology: report.topology || null,
  };
}
