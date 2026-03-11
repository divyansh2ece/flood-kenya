import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'
import TelegramIcon from './TelegramIcon'

const SEV = {
  1: {
    color:    '#22c55e',
    label:    'WATCH',
    cardCls:  'bg-emerald-50/60 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/40',
    badge:    'text-emerald-700 dark:text-emerald-400',
  },
  2: {
    color:    '#eab308',
    label:    'MODERATE',
    cardCls:  'bg-yellow-50/60 border-yellow-100 dark:bg-yellow-950/10 dark:border-yellow-900/40',
    badge:    'text-yellow-700 dark:text-yellow-400',
  },
  3: {
    color:    '#f97316',
    label:    'SEVERE',
    cardCls:  'bg-orange-50/60 border-orange-100 dark:bg-orange-950/10 dark:border-orange-900/40',
    badge:    'text-orange-700 dark:text-orange-400',
  },
  4: {
    color:    '#ef4444',
    label:    'CRITICAL',
    cardCls:  'bg-red-50/60 border-red-100 dark:bg-red-950/10 dark:border-red-900/40',
    badge:    'text-red-700 dark:text-red-400',
  },
  5: {
    color:    '#7f1d1d',
    label:    'EMERGENCY',
    cardCls:  'bg-red-100/50 border-red-200 dark:bg-red-950/20 dark:border-red-900/60',
    badge:    'text-red-900 dark:text-red-300',
  },
}

const WL_LABELS = {
  ankle: 'Ankle', knee: 'Knee', waist: 'Waist', shoulder: 'Shoulder', head: 'Head',
}

function SourceTag({ src }) {
  const s = (src || '').toLowerCase()
  if (s.includes('telegram'))
    return <span className="inline-flex items-center gap-1 text-[#229ED9]"><TelegramIcon size={9} />Telegram</span>
  if (s.includes('admin'))
    return <span>⚙ Admin</span>
  return <span>⊕ Web</span>
}

export default function IncidentFeed({ reports, hours, setHours, onResolve, onVerify }) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('all')

  const active = reports.filter(r => !r.resolved)

  const filtered = active.filter(r => {
    if (filter === 'rescue')   return r.needs_rescue
    if (filter === 'critical') return r.severity >= 4
    return true
  })

  const rescueCount   = active.filter(r => r.needs_rescue).length
  const criticalCount = active.filter(r => r.severity >= 4).length

  return (
    <div className="flex flex-col h-full min-w-0 bg-white dark:bg-navy-800">

      {/* ── HEADER ─────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-navy-600 shrink-0">

        {/* Count row */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[9px] font-bold tracking-[0.14em] text-slate-400 dark:text-slate-500 uppercase mb-0.5">
              Incident Feed
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[30px] font-black leading-none text-slate-800 dark:text-slate-100 tabular-nums">
                {filtered.length}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {filter === 'all' ? 'active' : filter}
              </span>
            </div>
          </div>

          {/* Time pills */}
          <div className="flex gap-1 pb-0.5">
            {[1, 6, 24].map(h => (
              <button
                key={h}
                onClick={() => setHours(h)}
                className={`w-9 h-6 text-[10px] font-bold font-mono rounded transition-all ${
                  hours === h
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-navy-900'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {h}H
              </button>
            ))}
          </div>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-3 gap-1">
          {[
            { key: 'all',      label: 'ALL',      count: active.length,  activeCls: 'bg-slate-800 dark:bg-slate-600 text-white',                                countCls: 'text-slate-400 dark:text-slate-500' },
            { key: 'rescue',   label: 'SOS',      count: rescueCount,    activeCls: 'bg-red-600    dark:bg-red-700    text-white', hasPulse: true,               countCls: 'text-red-500 dark:text-red-400'    },
            { key: 'critical', label: 'CRITICAL', count: criticalCount,  activeCls: 'bg-orange-500 dark:bg-orange-600 text-white',                               countCls: 'text-orange-500 dark:text-orange-400' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`relative flex items-center justify-center gap-1.5 py-[7px] rounded text-[10px] font-bold tracking-[0.08em] transition-all ${
                filter === f.key
                  ? f.activeCls
                  : 'bg-slate-100 dark:bg-navy-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-navy-600'
              }`}
            >
              {f.label}
              {f.count > 0 && filter !== f.key && (
                <span className={`text-[9px] font-mono font-bold tabular-nums ${f.countCls}`}>
                  {f.count}
                </span>
              )}
              {f.hasPulse && f.count > 0 && filter !== f.key && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-breathe" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── FEED LIST ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto thin-scroll px-2.5 py-2.5 space-y-1.5 min-w-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <span className="text-[26px] text-slate-200 dark:text-navy-600 select-none">◉</span>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t('feed.empty')}</p>
          </div>
        ) : (
          filtered.map((report, i) => (
            <ReportCard
              key={report.id}
              report={report}
              index={i}
              onResolve={onResolve}
              onVerify={onVerify}
            />
          ))
        )}
      </div>

      {/* ── TELEGRAM CTA ───────────────────────── */}
      <div className="px-2.5 pt-1.5 pb-2.5 border-t border-slate-100 dark:border-navy-600 shrink-0">
        <a
          href="https://t.me/flood_kenya_bot"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-[11px] font-semibold transition-colors"
          style={{
            color: '#229ED9',
            background: 'rgba(34,158,217,0.07)',
            border: '1px solid rgba(34,158,217,0.22)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,158,217,0.13)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,158,217,0.07)'}
        >
          <TelegramIcon size={12} />
          Report via Telegram
        </a>
      </div>
    </div>
  )
}

/* ── Individual Report Card ──────────────────────────────── */
function ReportCard({ report, index, onResolve, onVerify }) {
  const [resolving, setResolving] = useState(false)
  const sev   = SEV[report.severity] || SEV[2]
  const isSOS = !!report.needs_rescue

  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(report.created_at), { addSuffix: true }) }
    catch { return '' }
  })()

  const handleResolve = async () => {
    setResolving(true)
    await onResolve(report.id)
  }

  return (
    <div
      className={`feed-card-in rounded-lg border overflow-hidden ${sev.cardCls}`}
      style={{
        borderLeftWidth:  3,
        borderLeftColor:  sev.color,
        animationDelay:   `${Math.min(index * 38, 380)}ms`,
      }}
    >
      <div className="px-3 py-2.5">

        {/* Row 1: severity label + time */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {isSOS && (
              <span
                className="w-[5px] h-[5px] rounded-full animate-breathe shrink-0"
                style={{ background: '#ef4444' }}
              />
            )}
            <span className={`text-[9.5px] font-black tracking-[0.12em] ${sev.badge}`}>
              {isSOS ? `⚠ SOS · ${sev.label}` : sev.label}
            </span>
            {report.verified && (
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">✓</span>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 tabular-nums shrink-0 ml-2">
            {timeAgo}
          </span>
        </div>

        {/* Row 2: location — the hero */}
        <p className="text-[13px] font-bold leading-snug text-slate-800 dark:text-slate-100 break-words mb-2">
          <span
            className="font-mono text-[10px] mr-1"
            style={{ color: sev.color }}
          >▶</span>
          {report.location || report.county || 'Unknown location'}
        </p>

        {/* Row 3: water + infra chips */}
        {(report.water_level || report.infrastructure?.length > 0) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {report.water_level && (
              <span className="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-[3px] rounded-md bg-white/80 dark:bg-navy-600/60 border border-white dark:border-navy-500/50 text-slate-500 dark:text-slate-400">
                <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: sev.color }} />
                {WL_LABELS[report.water_level] || report.water_level}
              </span>
            )}
            {report.infrastructure?.map(inf => (
              <span
                key={inf}
                className="text-[9.5px] px-1.5 py-[3px] rounded-md bg-white/80 dark:bg-navy-600/60 border border-white dark:border-navy-500/50 text-slate-500 dark:text-slate-400"
              >
                {inf}
              </span>
            ))}
          </div>
        )}

        {/* Row 4: raw message preview */}
        {report.raw_message && (
          <p className="text-[10.5px] italic leading-relaxed text-slate-400 dark:text-slate-500 line-clamp-2 mb-2">
            "{report.raw_message}"
          </p>
        )}

        {/* Row 5: source + actions */}
        <div className="flex items-center justify-between pt-1.5 border-t border-black/5 dark:border-white/5">
          <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-mono">
            <SourceTag src={report.source} />
          </span>

          <div className="flex items-center gap-0.5">
            {!report.verified && (
              <button
                onClick={() => onVerify(report.id)}
                className="text-[9px] font-bold uppercase tracking-wide px-2 py-[3px] rounded text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all"
              >
                verify
              </button>
            )}
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="text-[9px] font-bold uppercase tracking-wide px-2 py-[3px] rounded text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all disabled:opacity-40"
            >
              {resolving ? '…' : 'resolve'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
