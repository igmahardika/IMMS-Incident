import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatDateTime, formatDuration } from '../utils/api.js';
import { NcalBadge, StatusPill, DurationBadge, Spinner } from '../components/ui/index.jsx';
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

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}><Spinner /></div>;
  if (!incident) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Incident tidak ditemukan.</div>;

  const { pause_logs = [], audit_logs = [] } = incident;
  const isDistribsi = ['ORANGE', 'RED', 'BLACK'].includes(incident.ncal);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={15} /></button>
          <div>
            <div className="page-title" style={{ fontFamily: 'monospace' }}>{incident.case_no}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <NcalBadge value={incident.ncal} />
              <StatusPill status={incident.status} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Basic Info */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Informasi Dasar</div>
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1rem' }}>
            {[
              [isDistribsi ? 'Segmen/Distribusi' : 'Site', incident.site_name_manual || incident.company_name || '—'],
              ['ODP / BTS', incident.odp_bts || '—'],
              ['Level', incident.level_support || '—'],
              ['Teknisi', incident.technician_name || incident.technician_name_manual || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</dt>
                <dd style={{ fontSize: '0.85rem', marginTop: 2 }}>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="divider" />
          <div>
            <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Problem Awal</dt>
            <dd style={{ fontSize: '0.85rem', marginTop: 4, lineHeight: 1.5 }}>{incident.initial_problem || '—'}</dd>
          </div>
          {incident.indikasi && (
            <div style={{ marginTop: '0.75rem' }}>
              <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Indikasi</dt>
              <dd style={{ fontSize: '0.85rem', marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{incident.indikasi}</dd>
            </div>
          )}
          {incident.pic && (
            <div style={{ marginTop: '0.75rem' }}>
              <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>PIC</dt>
              <dd style={{ fontSize: '0.85rem', marginTop: 4 }}>{incident.pic}</dd>
            </div>
          )}
          {incident.customer_terdampak && (
            <div style={{ marginTop: '0.75rem' }}>
              <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Customer Terdampak</dt>
              <dd style={{ fontSize: '0.85rem', marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{incident.customer_terdampak}</dd>
            </div>
          )}
        </div>

        {/* Resolution Info */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Resolusi</div>
          <dl style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Penyebab</dt>
              <dd style={{ fontSize: '0.85rem', marginTop: 2, lineHeight: 1.5 }}>{incident.root_cause || '—'}</dd>
            </div>
            <div>
              <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Action Terakhir</dt>
              <dd style={{ fontSize: '0.85rem', marginTop: 2, lineHeight: 1.5 }}>{incident.last_action || '—'}</dd>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Power Before</dt>
                <dd style={{ fontSize: '0.85rem', marginTop: 2 }}>{incident.power_before || '—'}</dd>
              </div>
              <div>
                <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Power After</dt>
                <dd style={{ fontSize: '0.85rem', marginTop: 2 }}>{incident.power_after || '—'}</dd>
              </div>
            </div>
            <div>
              <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Klasifikasi</dt>
              <dd style={{ fontSize: '0.85rem', marginTop: 2 }}>
                {incident.klasifikasi ? `${incident.klasifikasi} — ${incident.sub_klasifikasi}` : incident.classification_manual || '—'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Duration */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}><Clock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Timeline & Durasi</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              ['Start Time', formatDateTime(incident.start_time)],
              ['Start Action', formatDateTime(incident.start_action_time)],
              ['End Online', formatDateTime(incident.end_time)],
              ['Total Pause', <DurationBadge key="p" seconds={incident.total_pause_duration_seconds} />],
              ['Durasi Gross', <DurationBadge key="g" seconds={incident.duration_gross_seconds} />],
              ['Durasi Nett', <DurationBadge key="n" seconds={incident.duration_nett_seconds} />],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
                <div style={{ marginTop: 3, fontSize: '0.82rem' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pause Log */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}><Pause size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Log Pause ({pause_logs.length})</div>
          {pause_logs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Tidak ada pause</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pause_logs.map((p, i) => (
                <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.6rem 0.75rem', borderLeft: '3px solid var(--warning)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Pause #{i + 1}</span>
                    {p.duration_seconds && <DurationBadge seconds={p.duration_seconds} />}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {formatDateTime(p.pause_start)} → {formatDateTime(p.pause_end) || '(masih pause)'}
                  </div>
                  {p.reason && <div style={{ fontSize: '0.75rem', marginTop: 3, color: 'var(--text-secondary)' }}>"{p.reason}"</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Update Logs (Action Terakhir) */}
        {(() => {
          const actionLogs = audit_logs
            .filter(log => log.action === 'UPDATE' && log.details.includes('Action Terakhir:'))
            .map(log => {
              const match = log.details.match(/Action Terakhir:\s*([^|]+)/);
              return {
                id: log.id,
                time: log.timestamp,
                user: log.user_name,
                text: match ? match[1].trim() : ''
              };
            })
            .filter(log => log.text)
            .sort((a, b) => new Date(a.time) - new Date(b.time)); // Chronological order 1, 2, 3

          if (actionLogs.length === 0) return null;

          return (
            <div className="card" style={{ gridColumn: '1 / -1', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                <Edit2 size={14} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--accent)' }} />
                Update Resolusi (Action Terakhir)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {actionLogs.map((log, index) => (
                  <div key={log.id} style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
                    <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1.2rem', minWidth: '1.5rem' }}>{index + 1}.</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{log.text}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
                        Oleh <strong>{log.user || '—'}</strong> pada {formatDateTime(log.time)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Audit Log */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}><Activity size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Audit Trail</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Waktu</th><th>User</th><th>Action</th><th>Detail</th></tr></thead>
              <tbody>
                {audit_logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatDateTime(log.timestamp)}</td>
                    <td style={{ fontSize: '0.78rem' }}>{log.user_name || '—'}</td>
                    <td><span style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-hover)', padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.68rem', fontWeight: 600, fontFamily: 'monospace' }}>{log.action}</span></td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 320, wordBreak: 'break-word' }}>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
