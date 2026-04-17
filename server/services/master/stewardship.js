import db from '../../db.js';
import { getIncidentIntegritySummary } from '../incidents/integrity.js';
import { getUpdateWorkbookSyncReport } from './updateWorkbookReport.js';

export function getStewardshipReport() {
  const workbookReport = getUpdateWorkbookSyncReport();
  const incidentIntegrity = getIncidentIntegritySummary();

  const customerMissingCoords = db.prepare(`
    SELECT COUNT(*) AS count
    FROM master_customer
    WHERE is_active = 1
      AND (latitude IS NULL OR longitude IS NULL)
  `).get().count;

  const topologyMissingCoords = db.prepare(`
    SELECT COUNT(*) AS count
    FROM master_distribusi
    WHERE is_active = 1
      AND (latitude IS NULL OR longitude IS NULL)
  `).get().count;

  const customerSurveyLinked = db.prepare(`
    SELECT COUNT(*) AS count
    FROM master_customer
    WHERE is_active = 1
      AND survey_latitude IS NOT NULL
      AND survey_longitude IS NOT NULL
  `).get().count;

  const topologySurveyLinked = db.prepare(`
    SELECT COUNT(*) AS count
    FROM master_distribusi
    WHERE is_active = 1
      AND survey_latitude IS NOT NULL
      AND survey_longitude IS NOT NULL
  `).get().count;

  const customerUnmatched = workbookReport.customer?.unmatched || 0;
  const customerActionable = workbookReport.customer?.unmatched_actionable || 0;
  const customerExternalOnly = workbookReport.customer?.unmatched_external_only || 0;
  const topologyUnmatched = workbookReport.topology?.unmatched || 0;

  return {
    generatedAt: new Date().toISOString(),
    workbook: {
      available: workbookReport.available,
      generatedAt: workbookReport.generatedAt,
      reportPath: workbookReport.reportPath,
    },
    customers: {
      missingCoords: customerMissingCoords,
      surveyLinked: customerSurveyLinked,
      unmatchedWorkbookRows: customerUnmatched,
      actionableWorkbookRows: customerActionable,
      externalWorkbookRows: customerExternalOnly,
    },
    topology: {
      missingCoords: topologyMissingCoords,
      surveyLinked: topologySurveyLinked,
      unmatchedWorkbookLabels: topologyUnmatched,
    },
    incidents: incidentIntegrity.summary,
    blockers: {
      stewardshipBacklog: customerUnmatched + topologyUnmatched + customerMissingCoords + topologyMissingCoords,
      pendingIntegrityHealthy:
        incidentIntegrity.summary.pendingWithoutOpenPause === 0
        && incidentIntegrity.summary.openPauseWithoutPending === 0
        && incidentIntegrity.summary.doneWithOpenPause === 0,
    },
  };
}
