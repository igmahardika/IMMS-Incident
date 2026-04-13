import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIncident } from '../hooks/useIncidents.js';
import { formatDateTime, processTimeline, calculateIncidentLevel, getSLATarget, getIncidentDisplayName } from '../utils/incidentUtils.js';
import { NcalBadge, StatusPill, DurationBadge, PageSpinner, UnifiedTimeline, LevelBadge, SectionCard, Button } from '../components/ui/index.jsx';
import { ArrowLeft, Edit2, MapPin, Info, Shield, Activity } from 'lucide-react';
import { cn } from '../lib/utils.js';

export default function IncidentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: incident, isLoading: loading } = useIncident(id);

  if (loading) return <PageSpinner />;
  if (!incident) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-4xl opacity-20">🚫</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 text-center">Incident Record Not Found</div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>Go Back</Button>
    </div>
  );

  const isDistribsi = ['ORANGE', 'RED', 'BLACK'].includes(incident.ncal);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-background border border-foreground/5 p-4 rounded-xl shadow-sm shrink-0 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="w-9 h-9 p-0 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </Button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-black tracking-tighter font-mono text-primary leading-none uppercase">{incident.case_no}</h1>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-foreground/5 rounded-md border border-foreground/5">
                <StatusPill status={incident.status} />
                <LevelBadge level={calculateIncidentLevel(incident.start_time, incident.end_time)} targetHours={getSLATarget(incident.ncal) / 3600} />
                <NcalBadge value={incident.ncal} />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" icon={<Edit2 size={14} />} onClick={() => navigate(`/incidents/edit/${incident.id}`)}>
            Edit Record
            </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar pr-2 -mr-2">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pb-8">
        
        {/* Main Content Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Infrastructure & Location */}
          <SectionCard title="Core Asset Information" subtitle="Infrastructure and Locality Details" padding={false}>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {[
                { label: isDistribsi ? 'DISTRIBUTION' : 'SITE NAME', value: getIncidentDisplayName(incident), icon: MapPin },
                { label: incident.ncal === 'BLUE' ? 'DEVICE ID' : 'INFRASTRUCTURE', value: incident.odp_bts || '—', icon: Shield },
                { label: 'PRIORITY LEVEL', value: incident.level_support ? `P${incident.level_support}` : '—', icon: Info },
                { label: 'ASSIGNED OPERATOR', value: incident.pic || incident.technician_name || incident.technician_name_manual || '—', icon: Activity },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-1.5 group">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-foreground/40 uppercase tracking-widest group-hover:text-primary/70 transition-colors">
                    <item.icon size={12} strokeWidth={2.5} /> {item.label}
                  </div>
                  <div className="text-[11px] font-black tracking-tight text-foreground/90 leading-snug pl-5 border-l border-foreground/5">
                    {item.value}
                  </div>
                </div>
              ))}

              {incident.address && (
                <div className="md:col-span-2 flex flex-col gap-1.5 pt-2 border-t border-foreground/5">
                  <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Site Geo-Address</span>
                  <span className="text-[11px] font-bold text-foreground/80 leading-relaxed italic">{incident.address}</span>
                </div>
              )}

              {incident.koordinat && (
                <div className="flex flex-col gap-1.5 pt-2">
                  <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">GPS Coordinates</span>
                  <span className="text-[11px] font-mono font-black text-primary tracking-tighter">{incident.koordinat}</span>
                </div>
              )}
            </div>
            
            <div className="mx-6 mb-6 p-4 bg-muted/30 rounded-xl flex flex-col gap-4 border border-foreground/5">
                <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest">Problem Statement</span>
                    <p className="text-[11px] font-bold text-foreground/80 leading-relaxed italic">"{incident.initial_problem || 'No description provided'}"</p>
                </div>
                {incident.indikasi && (
                    <div className="flex flex-col gap-1.5 pt-3 border-t border-foreground/5">
                        <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest">Indication / Findings</span>
                        <p className="text-[11px] font-semibold text-foreground/70 leading-relaxed">{incident.indikasi}</p>
                    </div>
                )}
            </div>
          </SectionCard>

          {/* Maintenance Metadata (for Yellow) */}
          {incident.ncal === 'YELLOW' && (
             <SectionCard title="Technical Specifications" subtitle="Maintenance Order Data" padding={false}>
                <div className="p-6 grid grid-cols-3 gap-6 bg-warning/[0.03]">
                    {[
                        { l: 'CABLE MEDIUM', v: incident.kabel || '—' },
                        { l: 'SPAN DISTANCE', v: incident.panjang_kabel ? `${incident.panjang_kabel}m` : '—', mono: true, color: 'text-warning' },
                        { l: 'INIT POWER', v: incident.power_before || '—', mono: true }
                    ].map((m, i) => (
                        <div key={i} className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-foreground/30 uppercase tracking-widest">{m.l}</span>
                            <span className={cn("text-[11px] font-bold tracking-tight", m.mono && "font-mono tabular-nums", m.color || "text-foreground")}>{m.v}</span>
                        </div>
                    ))}
                </div>
             </SectionCard>
          )}

          {/* Timeline & Durations */}
          <SectionCard title="Performance Metrics" subtitle="Timeline & Duration Breakdown" padding={false}>
             <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 bg-foreground/[0.01]">
                {[
                  ['REPORTED TIMESTAMP', incident.start_time],
                  ['ACTION START', incident.start_action_time],
                  ['RESOLUTION TIME', incident.end_time],
                ].map(([l, v]) => (
                  <div key={l} className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black text-foreground/40 uppercase tracking-widest">{l}</span>
                    <span className="font-mono text-[11px] font-bold text-foreground/70 tabular-nums">
                      {v ? formatDateTime(v).replace(', ', '\n') : '—'}
                    </span>
                  </div>
                ))}
                
                {[
                  ['TOTAL HALT', <DurationBadge seconds={incident.total_pause_duration_seconds} />],
                  ['GROSS DURATION', <DurationBadge seconds={incident.duration_gross_seconds} />],
                  ['NETT PERFORMANCE', <DurationBadge seconds={incident.duration_nett_seconds} target={getSLATarget(incident.ncal)} />],
                ].map(([l, v]) => (
                  <div key={l} className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black text-foreground/40 uppercase tracking-widest">{l}</span>
                    <div className="h-5 flex items-center">{v}</div>
                  </div>
                ))}
             </div>
          </SectionCard>

          {/* Activity Logs */}
          <div className="flex flex-col md:flex-row gap-6">
            <SectionCard title="Technical Log" subtitle="Field activity timeline" padding={false} className="flex-1">
                <div className="p-2 min-h-[300px]">
                    <UnifiedTimeline timeline={processTimeline(incident)} filterType="technical" />
                </div>
            </SectionCard>
            <SectionCard title="System Log" subtitle="Audit & history logs" padding={false} className="flex-1">
                <div className="p-2 min-h-[300px]">
                    <UnifiedTimeline timeline={processTimeline(incident)} filterType="system" />
                </div>
            </SectionCard>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-8">
          <SectionCard title="Technical Resolution" subtitle="Root Cause & Outcome" padding={false}>
            <div className="p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Formal Root Cause</span>
                <div className="bg-foreground/[0.03] p-4 rounded-xl border border-foreground/5 text-[11px] font-bold text-foreground/80 leading-relaxed min-h-[60px]">
                  {incident.root_cause || 'Investigation pending...'}
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Final Handling Action</span>
                <div className="bg-foreground/[0.03] p-4 rounded-xl border border-foreground/5 text-[11px] font-bold text-foreground/80 leading-relaxed min-h-[60px]">
                  {incident.last_action || 'No action documented.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-foreground/5 pt-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black text-foreground/30 uppercase tracking-widest">POWER (INI)</span>
                  <span className="text-[11px] font-mono font-black text-primary tracking-tighter tabular-nums">{incident.power_before || '—'}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black text-foreground/30 uppercase tracking-widest">POWER (FIN)</span>
                  <span className="text-[11px] font-mono font-black text-success tracking-tighter tabular-nums">{incident.power_after || '—'}</span>
                </div>
              </div>

              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex flex-col gap-2">
                <span className="text-[9px] font-black text-primary/70 uppercase tracking-widest">Classification Hierarchy</span>
                <div className="flex flex-col gap-0.5">
                  {incident.klasifikasi ? (
                    <>
                      <span className="text-[9px] text-foreground/40 font-mono font-bold tracking-widest uppercase">{incident.klasifikasi}</span>
                      <span className="text-xs font-black text-primary tracking-tight">{incident.sub_klasifikasi}</span>
                    </>
                  ) : <span className="text-[11px] font-bold text-foreground/30 italic">Not yet classified</span>}
                </div>
              </div>
            </div>
          </SectionCard>
          
          {incident.customer_terdampak && isDistribsi && (
            <SectionCard title="Customer Impact" subtitle="Impacted Accounts" padding={false}>
              <div className="p-4">
                <div className="bg-error/5 p-4 rounded-xl text-[10px] leading-relaxed font-bold text-error/80 whitespace-pre-wrap border border-error/10">
                    {incident.customer_terdampak}
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
