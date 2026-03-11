import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'
import TelegramIcon from './TelegramIcon'

// Map source string → label (icon rendered separately for Telegram)
function sourceTag(src) {
  const s = src?.toLowerCase() || 'web'
  if (s.includes('telegram')) return { type: 'telegram', label: s.includes('miniapp') ? 'Telegram' : 'Bot' }
  if (s.includes('admin'))    return { type: 'text', icon: '⚙️', label: 'Admin' }
  return { type: 'text', icon: '🌐', label: 'Web' }
}

// Severity colour maps — uses custom sev-bar-N class from index.css for the left border
// (avoids Tailwind border shorthand overriding border-left-color)
const SEV = {
  1: { badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  2: { badge: 'bg-yellow-100  text-yellow-800  dark:bg-yellow-900/40  dark:text-yellow-300',  dot: 'bg-yellow-500'  },
  3: { badge: 'bg-orange-100  text-orange-800  dark:bg-orange-900/40  dark:text-orange-300',  dot: 'bg-orange-500'  },
  4: { badge: 'bg-red-100     text-red-800     dark:bg-red-900/40     dark:text-red-300',     dot: 'bg-red-500'     },
  5: { badge: 'bg-red-200     text-red-900     dark:bg-red-950/80     dark:text-red-200',     dot: 'bg-red-700 animate-pulse' },
}

export default function IncidentFeed({ reports, hours, setHours, onResolve, onVerify }) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('all')

  const filtered = reports.filter(r => {
    if (filter === 'rescue')   return r.needs_rescue && !r.resolved
    if (filter === 'critical') return r.severity >= 4 && !r.resolved
    return !r.resolved
  })

  return (
    <div className="flex flex-col h-full min-w-0">

      {/* ── Header & filters ─────────────────────────── */}
      <div className="px-2.5 pt-3 pb-2 border-b border-slate-200 dark:border-navy-600 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
            {t('feed.title')}
          </p>
          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
            {filtered.length}
          </span>
        </div>

        {/* Time filter */}
        <div className="flex gap-1 mb-1.5">
          {[1, 6, 24].map(h => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={`flex-1 text-[11px] py-1 rounded font-bold transition-all ${
                hours === h
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-navy-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-navy-600'
              }`}
            >
              {t(`feed.time.${h}h`)}
            </button>
          ))}
        </div>

        {/* Severity filter */}
        <div className="flex gap-1">
          {['all', 'rescue', 'critical'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 text-[11px] py-1 rounded font-bold transition-all capitalize ${
                filter === f
                  ? 'bg-slate-700 dark:bg-slate-500 text-white'
                  : 'bg-slate-100 dark:bg-navy-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-navy-600'
              }`}
            >
              {t(`feed.filters.${f}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Report list ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto thin-scroll py-1 min-w-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <span className="text-3xl mb-2">✅</span>
            <p className="text-slate-400 text-xs">{t('feed.empty')}</p>
          </div>
        ) : (
          filtered.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              onResolve={onResolve}
              onVerify={onVerify}
            />
          ))
        )}
      </div>

      {/* ── Telegram CTA ─────────────────────────────── */}
      <div className="px-2.5 py-2 border-t border-slate-200 dark:border-navy-600 shrink-0 bg-slate-50 dark:bg-navy-900/50">
        <a
          href="https://t.me/flood_kenya_bot"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 w-full bg-[#229ED9]/10 hover:bg-[#229ED9]/20 border border-[#229ED9]/30 text-[#229ED9] text-[11px] font-semibold py-1.5 rounded-lg transition-colors"
        >
          <TelegramIcon size={13} />
          <span>Report via Telegram</span>
        </a>
      </div>
    </div>
  )
}

function ReportCard({ report, onResolve, onVerify }) {
  const { t } = useTranslation()
  const [resolving, setResolving] = useState(false)
  const s = SEV[report.severity] || SEV[2]

  const handleResolve = async () => {
    setResolving(true)
    await onResolve(report.id)
  }

  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(report.created_at), { addSuffix: true }) }
    catch { return '' }
  })()

  return (
    // sev-bar-N from index.css sets border-left directly — no Tailwind conflict
    <div
      className={`
        sev-bar-${report.severity}
        mx-2 my-1 rounded-lg p-2.5 min-w-0
        border border-slate-200 dark:border-navy-600
        ${report.needs_rescue
          ? 'bg-red-50/80 dark:bg-red-950/20'
          : 'bg-white dark:bg-navy-700/50'
        }
      `}
    >
      {/* Row 1: badge + time */}
      <div className="flex items-start justify-between gap-1 mb-1.5 min-w-0">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-bold leading-tight whitespace-nowrap ${s.badge}`}>
            {t(`severity.${report.severity}`)}
          </span>
          {report.needs_rescue && (
            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white font-bold animate-breathe whitespace-nowrap">
              SOS
            </span>
          )}
          {report.verified && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">✓</span>
          )}
        </div>
        <span className="text-slate-400 dark:text-slate-500 text-[10px] font-mono shrink-0 whitespace-nowrap ml-1">
          {timeAgo}
        </span>
      </div>

      {/* Row 2: location — wraps, never truncates */}
      <p className="text-slate-800 dark:text-slate-200 text-xs font-semibold leading-snug break-words">
        📍 {report.location || report.county || 'Unknown location'}
      </p>

      {/* Row 3: water level + infra chips */}
      {(report.water_level || report.infrastructure?.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {report.water_level && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-navy-600 px-1.5 py-0.5 rounded">
              💧 {report.water_level}
            </span>
          )}
          {report.infrastructure?.map(i => (
            <span key={i} className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-navy-600 px-1.5 py-0.5 rounded">
              🏗️ {i}
            </span>
          ))}
        </div>
      )}

      {/* Row 4: message preview */}
      {report.raw_message && (
        <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-1 italic leading-snug line-clamp-2 break-words">
          "{report.raw_message}"
        </p>
      )}

      {/* Row 5: source icon + action buttons */}
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-navy-600/50 gap-1 min-w-0">
        {(() => {
          const tag = sourceTag(report.source)
          return tag.type === 'telegram' ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-[#229ED9] shrink-0" title={report.source}>
              <TelegramIcon size={11} />
              <span className="font-mono">{tag.label}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500 shrink-0" title={report.source}>
              <span className="leading-none">{tag.icon}</span>
              <span className="font-mono">{tag.label}</span>
            </span>
          )
        })()}
        <div className="flex items-center gap-0.5 shrink-0">
          {!report.verified && (
            <button
              onClick={() => onVerify(report.id)}
              title="Verify"
              className="text-[11px] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 px-1.5 py-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-bold"
            >
              ✓
            </button>
          )}
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="text-[11px] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-bold disabled:opacity-40 whitespace-nowrap"
          >
            {resolving ? '…' : t('feed.markResolved')}
          </button>
        </div>
      </div>
    </div>
  )
}
