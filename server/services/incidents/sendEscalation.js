import db from '../../db.js';
import logger from '../../utils/logger.js';

function stripInfraPrefix(value) {
  if (!value) return value;
  return value.replace(/^(ODP|ODC|BTS|POP|RADIO|OSC):\s*/i, '').trim();
}

function getDurationLabel(durationSeconds = 0) {
  const hours = String(Math.floor(durationSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((durationSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(durationSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function buildEscalationTemplates(seg) {
  const defaultTemplates = {
    template_open_internal_blue: `N-CAL : {ncal} - Level {level}\nNomor Case : {case_no}\nSite  : {brand}\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\nPIC: {pic}`,
    template_open_internal_yellow: `N-CAL : {ncal} - Level {level}\nNomor case : {case_no}\nSite  : {brand}\nStatus Link  : Down\nODP : {odp}\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\nWaktu Down : {time}\nPIC: {pic}`,
    template_open_vendor_yellow: `Maintenance Order\n{ncal}\nSite : {brand}\nNomor case : {case_no}\nTanggal case : {date}\nAlamat Customer : {address}\nKoordinat customer : {koordinat}\nNama ODP : {odp}\nPower RX Onu : {power_rx}\nKabel : {kabel}\nTotal Panjang : {panjang_kabel}\nPIC : {pic}\nProblem : {problem}`,
    template_close_internal_blue: `[CLOSE] {case_no}\n{ncal} - Level {level}\nSite: {brand}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`,
    template_close_internal_yellow: `[CLOSE] {case_no}\n{ncal} - Level {level}\nSite: {brand}\nStatus Link : Up\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`,
    template_close_vendor_yellow: `Close Order\n{ncal}\nSite : {brand}\nNomor case : {case_no}\nRoot Cause: {root_cause}\nAction: {action}\nNett: {duration}`,
  };

  defaultTemplates.template_open_internal_orange = `N-CAL : {ncal} - Level {level}\nNomor case : {case_no}\nODP : {odp}\nStatus Link  : Down\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\nWaktu Down : {time}\nCustomer Terdampak :\n{customer_terdampak}`;
  defaultTemplates.template_open_internal_red = `N-CAL : {ncal} - Level {level}\nNomor case : {case_no}\nODC : {odc}\nStatus Link  : Down\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\nWaktu Down : {time}\nCustomer Terdampak :\n{customer_terdampak}`;
  defaultTemplates.template_open_internal_black = `N-CAL : {ncal} - Level {level}\nNomor case : {case_no}\nPOP/OSC : {pop}\nStatus Link  : Down\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\nWaktu Down : {time}\nCustomer Terdampak :\n{customer_terdampak}`;

  ['orange', 'red', 'black'].forEach((segment) => {
    defaultTemplates[`template_close_internal_${segment}`] = `[CLOSE] {case_no}\n{ncal} - Level {level}\nInfra : {odp}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`;
  });

  return {
    defaultTemplates,
    seg: seg || 'yellow',
  };
}

function buildReplaceVars(incident, isClose = false, customOdp = null) {
  let ncalLabel = incident.ncal || '';
  if (isClose) {
    ncalLabel = `🟢 ${ncalLabel}`;
  } else if (ncalLabel === 'BLACK') {
    ncalLabel = `⚫ ${ncalLabel}`;
  } else if (ncalLabel === 'RED') {
    ncalLabel = `🔴 ${ncalLabel}`;
  } else if (ncalLabel === 'ORANGE') {
    ncalLabel = `🟠 ${ncalLabel}`;
  } else if (ncalLabel === 'YELLOW') {
    ncalLabel = `🟡 ${ncalLabel}`;
  } else if (ncalLabel === 'BLUE') {
    ncalLabel = `🔵 ${ncalLabel}`;
  }

  const duration = getDurationLabel(incident.duration_nett_seconds || 0);
  const endTime = incident.end_time ? new Date(incident.end_time).getTime() : Date.now();
  const grossSeconds = Math.max(0, Math.floor((endTime - new Date(incident.start_time).getTime()) / 1000));
  const level = Math.floor(grossSeconds / 3600) + 1;
  const now = new Date();
  const nowTimeLabel = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const nowDateLabel = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const cleanOdp = stripInfraPrefix(customOdp || incident.odp_bts || '-');

  return (template) => (template || '')
    .replace('{ncal}', ncalLabel)
    .replace('{level}', String(level))
    .replace('{case_no}', incident.case_no || '')
    .replace('{company}', incident.company_name || '')
    .replace('{brand}', incident.brand_site || '')
    .replace('{root_cause}', incident.root_cause || '-')
    .replace('{problem}', incident.initial_problem || '-')
    .replace('{action}', incident.last_action || '-')
    .replace('{duration}', duration)
    .replace('{time}', nowTimeLabel)
    .replace('{date}', nowDateLabel)
    .replace('{address}', incident.address || '-')
    .replace('{koordinat}', incident.koordinat || incident.link_coverage || '-')
    .replace('{odp}', cleanOdp)
    .replace('{odc}', cleanOdp)
    .replace('{bts}', cleanOdp)
    .replace('{pop}', cleanOdp)
    .replace('{ose}', cleanOdp)
    .replace('{radio}', cleanOdp)
    .replace('{osc}', cleanOdp)
    .replace('{power_rx}', incident.power_before || '-')
    .replace('{support_level}', incident.level_support || '-')
    .replace('{indikasi}', incident.indikasi || '-')
    .replace('{kabel}', incident.kabel || '-')
    .replace('{panjang_kabel}', incident.panjang_kabel || '-')
    .replace('{pic}', incident.pic || '-')
    .replace('{customer_terdampak}', incident.customer_terdampak || '-');
}

async function postWebhook(url, text) {
  if (!url || !text) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

export async function sendEscalation(incident, type) {
  const cfg = db.prepare('SELECT * FROM escalation_config LIMIT 1').get();
  if (!cfg || !cfg.is_active || (!cfg.webhook_url && !cfg.webhook_url_vendor)) return;

  const seg = (incident.ncal || 'yellow').toLowerCase();
  const { defaultTemplates } = buildEscalationTemplates(seg);

  try {
    if (cfg.type !== 'telegram') return;

    if (type === 'open') {
      const tplOpenInternal = cfg[`template_open_internal_${seg}`] || defaultTemplates[`template_open_internal_${seg}`] || cfg.template_open;
      const tplOpenVendor = cfg[`template_open_vendor_${seg}`] || defaultTemplates[`template_open_vendor_${seg}`] || cfg.template_open_vendor;

      const entities = ['ORANGE', 'RED', 'BLACK'].includes(incident.ncal) && incident.odp_bts
        ? incident.odp_bts.split(', ').map((entry) => entry.trim()).filter(Boolean)
        : [null];

      for (const entity of entities) {
        const replaceVars = buildReplaceVars(incident, false, entity);
        await postWebhook(cfg.webhook_url, replaceVars(tplOpenInternal));

        if (incident.ncal === 'YELLOW' && cfg.webhook_url_vendor && tplOpenVendor) {
          await postWebhook(cfg.webhook_url_vendor, replaceVars(tplOpenVendor));
        }
      }

      return;
    }

    const tplCloseInternal = cfg[`template_close_internal_${seg}`] || defaultTemplates[`template_close_internal_${seg}`] || cfg.template_close;
    const tplCloseVendor = cfg[`template_close_vendor_${seg}`] || defaultTemplates[`template_close_vendor_${seg}`] || cfg.template_close_vendor;
    const replaceVars = buildReplaceVars(incident, true);

    if (cfg.webhook_url && tplCloseInternal) {
      await postWebhook(cfg.webhook_url, replaceVars(tplCloseInternal));
    }

    if (incident.ncal === 'YELLOW' && cfg.webhook_url_vendor && tplCloseVendor) {
      await postWebhook(cfg.webhook_url_vendor, replaceVars(tplCloseVendor));
    }
  } catch (error) {
    logger.error(`Escalation webhook failed: ${error.message}`);
  }
}
