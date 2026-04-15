export function padMonth(value) {
  return String(value).padStart(2, '0');
}

export function buildCompletedIncidentFilter({ year, month, alias = 'i' } = {}) {
  let where = `${alias}.status = 'done'`;
  const params = [];

  if (year) {
    where += ` AND strftime('%Y', ${alias}.end_time) = ?`;
    params.push(String(year));
  }

  if (month) {
    where += ` AND strftime('%m', ${alias}.end_time) = ?`;
    params.push(padMonth(month));
  }

  return { where, params };
}

export function resolveAnalyticsDateRange(startDate, endDate) {
  return {
    startDate: startDate || '2026-01-01 00:00:00',
    endDate: endDate || '2026-12-31 23:59:59',
  };
}
