export const USER_ROLE_PRIORITY = `
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'noc' THEN 3
    WHEN 'technician' THEN 4
    ELSE 9
  END
`;

export function normalizeIds(ids) {
  return [...new Set((ids || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
}

export function normalizeInfraLabel(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ');
}

export function looksLikeInternalTopologyLabel(value) {
  const text = normalizeInfraLabel(value);
  if (!text) return false;
  return /^(POP|OSC|ODC|ODP|BTS|RADIO|OLT)\b/.test(text);
}
