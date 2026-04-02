import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatDateTime, formatDuration, processTimeline, calculateIncidentLevel, getSLATarget } from '../utils/api.js';
import { NcalBadge, StatusPill, DurationBadge, PageSpinner, UnifiedTimeline, LevelBadge } from '../components/ui/index.jsx';
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <span className="loading loading-spinner loading-lg text-primary opacity-20"></span>
      <span className="text-xs font-bold uppercase tracking-wider text-base-content/65">Loading Incident Details</span>
    </div>
  );
  if (!incident) return <div className="p-12 text-center text-xs font-bold uppercase tracking-wider text-base-content/65">Incident Record Not Found.</div>;

  const isDistribsi = ['ORANGE', 'RED', 'BLACK'].includes(incident.ncal);

  return (
    <div className="flex flex-col gap-4 md:gap-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button className="btn btn-ghost btn-circle btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <h1 className="text-lg md:text-xl font-bold tracking-tight font-mono text-primary truncate max-w-[150px] md:max-w-none">{incident.case_no}</h1>
              <div className="flex gap-1.5 flex-wrap">
                <StatusPill status={incident.status} />
                <LevelBadge level={calculateIncidentLevel(incident.start_time, incident.end_time)} />
                <NcalBadge value={incident.ncal} />
              </div>
            </div>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/incidents/edit/${incident.id}`)}>
          <Edit2 size={14} /> Edit Incident
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Main Column */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Basic Info */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/65 pb-2 border-b border-base-content/5">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                [isDistribsi ? 'DISTRIBUTION' : 'SITE', (isDistribsi ? (incident.odp_bts || incident.site_name_manual) : (incident.site_name_manual || incident.company_name)) || '—'],
                [incident.ncal === 'BLUE' ? 'DEVICE' : 'INFRASTRUCTURE', incident.odp_bts || '—'],
                ['PRIORITY', incident.level_support ? `P${incident.level_support}` : '—'],
                ['PIC / TECHNICIAN', incident.pic || incident.technician_name || incident.technician_name_manual || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-base-content/65 uppercase tracking-wider">{k}</span>
                  <span className="text-sm font-bold tracking-tight text-base-content/90 leading-none">{v}</span>
                </div>
              ))}

                {incident.address && (
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-base-content/65 uppercase tracking-wider">SITE ADDRESS</span>
                    <span className="text-xs text-base-content/90 font-bold leading-relaxed">{incident.address}</span>
                  </div>
                )}

              {incident.koordinat && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-base-content/65 uppercase tracking-wider">COORDINATES</span>
                    <span className="text-xs font-mono font-bold text-secondary tracking-tighter">{incident.koordinat}</span>
                  </div>
              )}
              
              <div className="md:col-span-2 flex flex-col gap-2 mt-2">
                <span className="text-xs font-bold text-base-content/65 uppercase tracking-wider">INITIAL PROBLEM</span>
                <div className="bg-base-200/40 p-3.5 rounded-xl text-sm leading-relaxed font-bold text-base-content/85 italic">
                  "{incident.initial_problem || '—'}"
                </div>
              </div>

              {incident.indikasi && (
                <div className="md:col-span-2 flex flex-col gap-2">
                  <span className="text-xs font-bold text-base-content/65 uppercase tracking-wider">INDICATION / SYMPTOMS</span>
                  <div className="bg-base-200/40 p-3.5 rounded-xl text-sm leading-relaxed font-bold text-base-content/90">
                    {incident.indikasi}
                  </div>
                </div>
              )}

              {incident.customer_terdampak && isDistribsi && (
                <div className="md:col-span-2 flex flex-col gap-2">
                  <span className="text-xs font-semibold text-base-content/70 uppercase tracking-wider">IMPACTED CUSTOMERS</span>
                  <div className="bg-base-200/50 p-4 rounded-lg text-sm leading-relaxed font-medium whitespace-pre-wrap">
                    {incident.customer_terdampak}
                  </div>
                </div>
              )}
            </div>

            {incident.ncal === 'YELLOW' && (
              <div className="mt-4 p-4 bg-warning/5 rounded-lg">
                <div className="text-xs font-semibold text-warning uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity size={12} /> Maintenance Order Data
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-base-content/70 uppercase">CABLE TYPE</span>
                    <span className="text-xs font-medium">{incident.kabel || '—'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-base-content/70 uppercase">LENGTH</span>
                    <span className="text-xs font-medium font-mono text-warning">{incident.panjang_kabel ? `${incident.panjang_kabel}m` : '—'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-base-content/70 uppercase">POWER (INI)</span>
                    <span className="text-xs font-medium font-mono tracking-tighter">{incident.power_before || '—'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timeline & Durations */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/65 pb-2 border-b border-base-content/5">Timeline & Durations</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 bg-base-200/50 p-4 rounded-xl">
              {[
                ['REPORTED TIME', <span className="font-mono tracking-tighter font-bold text-base-content/80">{formatDateTime(incident.start_time)}</span>],
                ['START ACTION', <span className="font-mono tracking-tighter font-bold text-base-content/80 text-xs md:text-sm">{formatDateTime(incident.start_action_time)}</span>],
                ['RESOLUTION TIME', <span className="font-mono tracking-tighter font-bold text-base-content/80 text-xs md:text-sm">{formatDateTime(incident.end_time)}</span>],
                ['TOTAL PAUSE', <DurationBadge key="p" seconds={incident.total_pause_duration_seconds} />],
                ['GROSS DURATION', <DurationBadge key="g" seconds={incident.duration_gross_seconds} />],
                ['NETT DURATION', <DurationBadge key="n" seconds={incident.duration_nett_seconds} target={getSLATarget(incident.ncal)} />],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1.5">
                  <span className="text-xs md:text-xs font-bold text-base-content/65 uppercase tracking-wider">{k}</span>
                  <div className="text-xs md:text-sm font-bold text-base-content/90 tracking-tight">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Logs (Unified Timeline) */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/65 pb-2 border-b border-base-content/5">Handling History</h3>
            <UnifiedTimeline timeline={processTimeline(incident)} filterType="technical" />
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/65 pb-2 border-b border-base-content/5">System Activity Log</h3>
            <UnifiedTimeline timeline={processTimeline(incident)} filterType="system" />
          </div>
        </div>

        {/* Sidebar / Aside Column */}
        <div className="flex flex-col gap-4 sticky top-6">
          <div className="bg-base-100 p-4 rounded-xl shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/65 pb-3 mb-4 border-b border-base-content/5">Technical Details</h3>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-base-content/65 uppercase tracking-wider">ROOT CAUSE</span>
                <div className="bg-base-200/50 p-3.5 rounded-xl text-sm leading-relaxed font-bold text-base-content/90">
                  {incident.root_cause || '—'}
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-base-content/65 uppercase tracking-wider">LAST ACTION</span>
                <div className="bg-base-200/50 p-3.5 rounded-xl text-sm leading-relaxed font-bold text-base-content/90">
                  {incident.last_action || '—'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-base-content/65 uppercase tracking-wider">RX POWER (INI)</span>
                  <span className="text-xs font-mono font-bold tracking-tighter text-primary">{incident.power_before || '—'}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-base-content/65 uppercase tracking-wider">RX POWER (FIN)</span>
                  <span className="text-xs font-mono font-bold tracking-tighter text-success">{incident.power_after || '—'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pt-4">
                <span className="text-xs font-bold text-base-content/65 uppercase tracking-wider">CLASSIFICATION</span>
                <div className="flex flex-col gap-1 mt-1">
                  {incident.klasifikasi ? (
                    <>
                      <span className="text-xs text-base-content/65 font-mono font-bold tracking-wider uppercase">{incident.klasifikasi}</span>
                      <span className="text-sm font-bold text-primary tracking-tight">{incident.sub_klasifikasi}</span>
                    </>
                  ) : <span className="text-sm font-bold opacity-30 tracking-tight">{incident.classification_manual || '—'}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
