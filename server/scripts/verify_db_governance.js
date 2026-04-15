import assert from 'node:assert/strict';

import db from '../db.js';
import { getRuntimeSchemaPatchStatus } from '../database/runtimeCompatibility.js';

function main() {
  const status = getRuntimeSchemaPatchStatus(db);
  for (const patch of status) {
    assert.equal(patch.ok, true, `DB governance check failed for ${patch.id}`);
  }

  const summary = status.map((patch) => patch.id).join(', ');
  console.log(`DB governance verification passed: ${summary}`);
}

try {
  main();
} catch (error) {
  console.error('DB governance verification failed.');
  console.error(error);
  process.exitCode = 1;
}
