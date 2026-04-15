import { getRecurringIncidents } from './queries.js';

export function getRecurringIncidentSummary(id) {
  const recurring = getRecurringIncidents(id);
  if (!recurring) return null;

  const { list } = recurring;
  return {
    is_recurring: list.length >= 2,
    count: list.length + 1,
    history: list.map((item) => ({
      id: item.id,
      case_no: item.case_no,
      start_time: item.start_time,
      status: item.status,
    })),
  };
}
