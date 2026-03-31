import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatDateTime, formatDuration, processTimeline, calculateIncidentLevel, getSLATarget } from '../utils/api.js';
import { NcalBadge, StatusPill, DurationBadge, PageSpinner, SectionCard, UnifiedTimeline, LevelBadge } from '../components/ui/index.jsx';
import { ArrowLeft, Clock, Pause, Activity, Edit2 } from 'lucide-react';

export default function IncidentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api.getIncident(id).then(setIncident).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}><PageSpinner /></div>;
  if (!incident) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Incident not found.</div>;

  const isDistribsi = ['ORANGE', 'RED', 'BLACK'].includes(incident.ncal);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={16} strokeWidth={1.5} /></button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 className="page-title text-id tabular" style={{ fontSize: 'var(--f-xl)', fontWeight: 800 }}>{incident.case_no}</h1>
              <StatusPill status={incident.status} />
              <LevelBadge level={calculateIncidentLevel(incident.start_time, incident.end_time)} />
              <NcalBadge value={incident.ncal} />
            </div>
          </div>
        </div>
      </div>

      <div className="layout-with-aside">
        
        {/* Main Column */}
        <div className="page-stack">
          {/* Basic Info */}
          <SectionCard>
            <div className="section-card-header">
              <div className="section-card-title">Basic Information</div>
            </div>
            <div className="section-card-body" style={{ padding: '1rem' }}>
              <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem 1rem' }}>
                {[
                  [isDistribsi ? 'DISTRIBUTION' : 'SITE', (isDistribsi ? (incident.odp_bts || incident.site_name_manual) : (incident.site_name_manual || incident.company_name)) || '—'],
                  [incident.ncal === 'BLUE' ? 'DEVICE' : 'ODP / BTS / INFRA', incident.odp_bts || '—'],
                  ['PRIORITY', incident.level_support ? `P${incident.level_support}` : '—'],
                  ['PIC / TECHNICIAN', incident.pic || incident.technician_name || incident.technician_name_manual || '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 'var(--f-xs)', fontWeight: 600, letterSpacing: '0.04em' }}>{k}</dt>
                    <dd className="text-sm" style={{ marginTop: 4, fontWeight: 500 }}>{v}</dd>
                  </div>
                ))}

                {incident.address && (
                  <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem' }}>
                    <dt className="text-xs" style={{ color: 'var(--text-muted)' }}>SITE ADDRESS</dt>
                    <dd className="text-sm" style={{ marginTop: 4, color: 'var(--text-secondary)' }}>{incident.address}</dd>
                  </div>
                )}

                {incident.koordinat && (
                  <div style={{ marginTop: '0.25rem' }}>
                    <dt className="text-xs" style={{ color: 'var(--text-muted)' }}>COORDINATES</dt>
                    <dd className="text-sm text-id tabular" style={{ marginTop: 4 }}>{incident.koordinat}</dd>
                  </div>
                )}
                
                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                  <dt className="text-xs" style={{ color: 'var(--text-muted)' }}>INITIAL PROBLEM</dt>
                  <dd className="preview-block text-sm" style={{ marginTop: 6, padding: '0.75rem', minHeight: 'auto' }}>{incident.initial_problem || '—'}</dd>
                </div>

                {incident.indikasi && (
                  <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem' }}>
                    <dt className="text-xs" style={{ color: 'var(--text-muted)' }}>INDICATION / SYMPTOMS</dt>
                    <dd className="preview-block text-sm" style={{ marginTop: 6, padding: '0.75rem', minHeight: 'auto' }}>{incident.indikasi}</dd>
                  </div>
                )}

                {incident.customer_terdampak && isDistribsi && (
                  <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem' }}>
                    <dt className="text-xs" style={{ color: 'var(--text-muted)' }}>IMPACTED CUSTOMERS</dt>
                    <dd className="preview-block text-sm" style={{ marginTop: 6, padding: '0.75rem', minHeight: 'auto' }}>{incident.customer_terdampak}</dd>
                  </div>
                )}
              </dl>

              {incident.ncal === 'YELLOW' && (
                <div style={{ marginTop: '1.25rem', border: '1px solid var(--warning)', borderRadius: 8, padding: '0.875rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--warning)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    Maintenance Order Data
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>CABLE TYPE</div>
                      <div className="text-sm" style={{ marginTop: 4 }}>{incident.kabel || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>CABLE LENGTH</div>
                      <div className="text-sm" style={{ marginTop: 4 }}>{incident.panjang_kabel ? `${incident.panjang_kabel}` : '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>POWER (INI)</div>
                      <div className="text-sm text-id tabular" style={{ marginTop: 4 }}>{incident.power_before || '—'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Timeline & Durations */}
          <SectionCard title={<span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--f-sm)' }}><Clock size={16} strokeWidth={1.5} /> Timeline & Durations</span>}>
            <div className="section-card-body" style={{ padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                {[
                  ['REPORTED TIME', <span className="tabular">{formatDateTime(incident.start_time)}</span>],
                  ['START ACTION', <span className="tabular">{formatDateTime(incident.start_action_time)}</span>],
                  ['RESOLUTION TIME', <span className="tabular">{formatDateTime(incident.end_time)}</span>],
                  ['TOTAL PAUSE', <DurationBadge key="p" seconds={incident.total_pause_duration_seconds} />],
                  ['GROSS DURATION', <DurationBadge key="g" seconds={incident.duration_gross_seconds} />],
                  ['NETT DURATION', <DurationBadge key="n" seconds={incident.duration_nett_seconds} target={getSLATarget(incident.ncal)} />],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-xs" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 'var(--f-xs)', fontWeight: 600 }}>{k}</div>
                    <div className="text-sm" style={{ marginTop: 6, fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* Activity Logs (Unified Timeline) */}
          <SectionCard title={<span><Activity size={16} strokeWidth={1.5} /> Handling History</span>}>
            <div className="section-card-body" style={{ padding: 0 }}>
              <UnifiedTimeline timeline={processTimeline(incident)} filterType="technical" />
            </div>
          </SectionCard>

          <SectionCard title={<span><Activity size={16} strokeWidth={1.5} /> System Activity Log</span>}>
            <div className="section-card-body" style={{ padding: 0 }}>
              <UnifiedTimeline timeline={processTimeline(incident)} filterType="system" />
            </div>
          </SectionCard>
        </div>

        {/* Sidebar / Aside Column */}
        <div className="aside-sticky">
          <div className="page-stack">
            
            {/* Latest Resolution Stats */}
            <div className="section-card">
              <div className="section-card-header" style={{ background: 'var(--bg-elevated)', borderBottomColor: 'var(--border)' }}>
                <div className="section-card-title" style={{ fontSize: 'var(--f-xs)', color: 'var(--text-secondary)' }}>Technical Details</div>
              </div>
              <div className="section-card-body" style={{ padding: '1rem' }}>
                <dl style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>ROOT CAUSE</dt>
                    <dd className="preview-block" style={{ marginTop: 6, padding: '0.75rem', fontSize: '0.8rem', minHeight: 'auto' }}>{incident.root_cause || '—'}</dd>
                  </div>
                  <div>
                    <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>LAST ACTION</dt>
                    <dd className="preview-block" style={{ marginTop: 6, padding: '0.75rem', fontSize: '0.8rem', minHeight: 'auto' }}>{incident.last_action || '—'}</dd>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <dt className="text-xs" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>RX POWER (INI)</dt>
                      <dd className="text-id text-sm tabular" style={{ fontWeight: 600, marginTop: 6 }}>{incident.power_before || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>RX POWER (FIN)</dt>
                      <dd className="text-id text-sm tabular" style={{ fontWeight: 600, marginTop: 6 }}>{incident.power_after || '—'}</dd>
                    </div>
                  </div>
                  <div>
                    <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>CLASSIFICATION</dt>
                    <dd style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 4 }}>
                      {incident.klasifikasi ? `${incident.klasifikasi} — ${incident.sub_klasifikasi}` : incident.classification_manual || '—'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
