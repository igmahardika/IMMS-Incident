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
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={16} /></button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <LevelBadge level={calculateIncidentLevel(incident.start_time, incident.end_time)} />
              <h1 className="page-title" style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{incident.case_no}</h1>
              <StatusPill status={incident.status} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
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
                  ['PRIORITY', incident.level_support || '—'],
                  ['PIC / TECHNICIAN', incident.pic || incident.technician_name || incident.technician_name_manual || '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>{k}</dt>
                    <dd style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: 4 }}>{v}</dd>
                  </div>
                ))}

                {incident.address && (
                  <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem' }}>
                    <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>SITE ADDRESS</dt>
                    <dd style={{ fontSize: '0.8rem', marginTop: 4, color: 'var(--text-secondary)' }}>{incident.address}</dd>
                  </div>
                )}

                {incident.koordinat && (
                  <div style={{ marginTop: '0.25rem' }}>
                    <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>COORDINATES</dt>
                    <dd style={{ fontSize: '0.85rem', fontFamily: 'monospace', marginTop: 4 }}>{incident.koordinat}</dd>
                  </div>
                )}
                
                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                  <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>INITIAL PROBLEM</dt>
                  <dd className="preview-block" style={{ marginTop: 6, padding: '0.75rem', fontSize: '0.8rem', minHeight: 'auto' }}>{incident.initial_problem || '—'}</dd>
                </div>

                {incident.indikasi && (
                  <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem' }}>
                    <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>INDICATION / SYMPTOMS</dt>
                    <dd className="preview-block" style={{ marginTop: 6, padding: '0.75rem', fontSize: '0.8rem', minHeight: 'auto' }}>{incident.indikasi}</dd>
                  </div>
                )}

                {incident.customer_terdampak && isDistribsi && (
                  <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem' }}>
                    <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>IMPACTED CUSTOMERS</dt>
                    <dd className="preview-block" style={{ marginTop: 6, padding: '0.75rem', fontSize: '0.8rem', minHeight: 'auto' }}>{incident.customer_terdampak}</dd>
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
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>CABLE TYPE</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: 4 }}>{incident.kabel || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>CABLE LENGTH</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: 4 }}>{incident.panjang_kabel ? `${incident.panjang_kabel}` : '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>POWER (INI)</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: 4, fontFamily: 'monospace' }}>{incident.power_before || '—'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Timeline & Durations */}
          <SectionCard title={<span><Clock size={15} /> Timeline & Durations</span>}>
            <div className="section-card-body" style={{ padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                {[
                  ['REPORTED TIME', formatDateTime(incident.start_time)],
                  ['START ACTION', formatDateTime(incident.start_action_time)],
                  ['RESOLUTION TIME', formatDateTime(incident.end_time)],
                  ['TOTAL PAUSE', <DurationBadge key="p" seconds={incident.total_pause_duration_seconds} />],
                  ['GROSS DURATION', <DurationBadge key="g" seconds={incident.duration_gross_seconds} />],
                  ['NETT DURATION', <DurationBadge key="n" seconds={incident.duration_nett_seconds} target={getSLATarget(incident.ncal)} />],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>{k}</div>
                    <div style={{ marginTop: 6, fontSize: '0.85rem', fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* Activity Logs (Unified Timeline) */}
          <SectionCard title={<span><Activity size={15} /> Handling History</span>}>
            <div className="section-card-body" style={{ padding: 0 }}>
              <UnifiedTimeline timeline={processTimeline(incident)} filterType="technical" />
            </div>
          </SectionCard>

          <SectionCard title={<span><Activity size={15} /> System Activity Log</span>}>
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
              <div className="section-card-header" style={{ background: 'var(--accent-subtle)', borderBottomColor: 'rgba(99,102,241,0.2)' }}>
                <div className="section-card-title" style={{ color: 'var(--accent-light)' }}>Technical Details</div>
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
                      <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>RX POWER (INI)</dt>
                      <dd style={{ fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 600, marginTop: 6 }}>{incident.power_before || '—'}</dd>
                    </div>
                    <div>
                      <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>RX POWER (FIN)</dt>
                      <dd style={{ fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 600, marginTop: 6 }}>{incident.power_after || '—'}</dd>
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
