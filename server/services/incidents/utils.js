import logger from '../../utils/logger.js';

export function parseOptionalInt(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function normalizeIncidentIds(ids) {
  return [...new Set(
    (ids || [])
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isInteger(value) && value > 0)
  )];
}

export function runIncidentSideEffects(task) {
  try {
    task();
  } catch (error) {
    logger.error(`Incident side effect failed: ${error.message}`);
  }
}
