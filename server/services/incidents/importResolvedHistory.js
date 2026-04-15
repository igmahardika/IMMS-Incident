import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import logger from '../../utils/logger.js';

const execFileAsync = promisify(execFile);

export async function importResolvedHistory({ filename, contentBase64, cwd = process.cwd() }) {
  let tempDir = '';

  try {
    const workbookBuffer = Buffer.from(contentBase64, 'base64');
    if (!workbookBuffer.length) {
      const error = new Error('Uploaded file is empty.');
      error.status = 400;
      throw error;
    }

    tempDir = await mkdtemp(join(tmpdir(), 'imms-history-import-'));
    const workbookPath = join(tempDir, filename.replace(/[^a-zA-Z0-9._-]+/g, '_'));
    const reportPath = join(tempDir, 'import-report.json');
    await writeFile(workbookPath, workbookBuffer);

    const { stdout } = await execFileAsync(
      'python3',
      [
        'server/scripts/import_manual_resolved_history.py',
        '--apply',
        '--workbook',
        workbookPath,
        '--report',
        reportPath,
      ],
      { cwd, maxBuffer: 10 * 1024 * 1024 }
    );

    return JSON.parse(stdout.trim());
  } catch (error) {
    const stderr = String(error.stderr || '').trim();
    const stdout = String(error.stdout || '').trim();
    const message = stderr || stdout || error.message || 'Failed to import resolved history workbook.';
    logger.error(`History import failed: ${message}`);

    const isValidationError = [
      'Unexpected workbook header order',
      'Workbook not found',
      'Uploaded file is empty',
      'Only .xlsx files are supported',
      'File payload is incomplete',
    ].some((pattern) => message.includes(pattern));

    const wrappedError = new Error(message);
    wrappedError.status = isValidationError ? 400 : 500;
    throw wrappedError;
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
