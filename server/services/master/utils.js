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

export function normalizeTopologyKey(value) {
  const text = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/^ODP\s+/, '')
    .replace(/_/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, '');

  if (!text) return '';

  const hyphenZonePattern = text.match(/^([A-Z]{2,}[A-Z0-9]*?)-([A-Z])(\d{1,2})$/);
  if (hyphenZonePattern) {
    return `${hyphenZonePattern[1]}-${hyphenZonePattern[2]}${String(Number(hyphenZonePattern[3])).padStart(2, '0')}`;
  }

  const zonePattern = text.match(/^([A-Z]{2,}[A-Z0-9]*?)([A-Z])(\d{1,2})$/);
  if (zonePattern) {
    return `${zonePattern[1]}-${zonePattern[2]}${String(Number(zonePattern[3])).padStart(2, '0')}`;
  }

  const numericSuffixPattern = text.match(/^([A-Z]{2,}[A-Z0-9-]*?)-?(\d{1,2})$/);
  if (numericSuffixPattern) {
    return `${numericSuffixPattern[1].replace(/-+$/, '')}-${String(Number(numericSuffixPattern[2])).padStart(2, '0')}`;
  }

  return text;
}

export function topologyCandidateKeys(rawValue) {
  const normalized = normalizeTopologyKey(rawValue);
  if (!normalized) return [];

  const candidates = [normalized];
  const strippedInfraPrefix = normalized.replace(/^(POP|BTS|OSC|ODC|ODP|OLT|UPT|UP)-?/, '');
  if (strippedInfraPrefix && strippedInfraPrefix !== normalized) candidates.push(normalizeTopologyKey(strippedInfraPrefix));
  if (normalized.startsWith('JB-')) candidates.push(normalizeTopologyKey(normalized.slice(3)));
  if (normalized.startsWith('JB') && normalized.length > 2 && normalized[2] !== '-') candidates.push(normalizeTopologyKey(normalized.slice(2)));
  if (normalized.startsWith('PND-')) candidates.push(normalizeTopologyKey(normalized.slice(4)));
  if (normalized.startsWith('PND') && normalized.length > 3 && normalized[3] !== '-') candidates.push(normalizeTopologyKey(normalized.slice(3)));
  if (normalized.startsWith('TRB-')) candidates.push(normalizeTopologyKey(normalized.slice(4)));
  if (normalized.startsWith('TRB') && normalized.length > 3 && normalized[3] !== '-') candidates.push(normalizeTopologyKey(normalized.slice(3)));

  return [...new Set(candidates.filter(Boolean))];
}

export function looksLikeInternalTopologyLabel(value) {
  const text = normalizeInfraLabel(value);
  if (!text) return false;
  return /^(POP|OSC|ODC|ODP|BTS|RADIO|OLT)\b/.test(text);
}
