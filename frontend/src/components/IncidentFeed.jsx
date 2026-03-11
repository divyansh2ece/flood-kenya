import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'

const SEV_COLOR = {
  1: { bar: 'border-l-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  2: { bar: 'border-l-yellow-500',  dot: 'bg-yellow-500',  badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  3: { bar: 'border-l-orange-500',  dot: 'bg-orange-500',  badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  4: { bar: 'border-l-red-500',     dot: 'bg-red-500',     badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  5: { bar: 'border-l-red-800',     dot: 'bg-red-700 animate-pulse', badge: 'bg-red-200 text-red-900 dark:bg-red-900/70 dark:text-red-200' },
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2.5 border-b border-slate-200 dark:border-navy-600 shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">{t('feed.title')}</p>
          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">{filtered.length}</span>
        </div>

        {/* Time filter */}
        <div className="flex gap-1 mb-2">
          {[1, 6, 24].map(h => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={`flex-1 text-xs py-1 rounded-md font-semibold transition-all ${
                hours === h
                  ? 'bg-blue-600 text-white shadow-sm'
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
              className={`flex-1 text-xs py-1 rounded-md font-semibold transition-all capitalize ${
                filter === f
                  ? 'bg-slate-700 dark:bg-slate-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-navy-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-navy-600'
              }`}
            >
              {t(`feed.filters.${f}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Report list */}
      <div className="flex-1 overflow-y-auto thin-scroll py-1.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <span className="text-3xl mb-2">✅</span>
            <p className="text-slate-400 text-xs">{t('feed.empty')}</p>
          </div>
        ) : (
          filtered.map(report => (
            <ReportCard key={report.id} report={report} onResolve={onResolve} onVerify={onVerify} />
          ))
        )}
      </div>

      {/* Telegram CTA */}
      <div className="px-3 py-2.5 border-t border-slate-200 dark:border-navy-600 shrink-0 bg-slate-50 dark:bg-navy-900/50">
        <a
          href="https://t.me/flood_kenya_bot"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 text-xs font-semibold py-2 rounded-lg transition-colors"
        >
          <span>✈️</span>
          <span>Report via Telegram</span>
        </a>
      </div>
    </div>
  )
}

function ReportCard({ report, onResolve, onVerify }) {
  const { t } = useTranslation()
  const [resolving, setResolving] = useState(false)
  const s = SEV_COLOR[report.severity] || SEV_COLOR[2]

  const handleResolve = async () => {
    setResolving(true)
    await onResolve(report.id)
  }

  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(report.created_at), { addSuffix: true }) }
    catch { return '' }
  })()

  return (
    <div className={`mx-2 my-1 rounded-lg border border-l-4 ${s.bar} ${
      report.needs_rescue
        ? 'border-red-200 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/20'
        : 'border-slate-200 bg-white dark:border-navy-600 dark:bg-navy-700/50'
    } p-2.5`}>

      {/* Top row */}
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${s.badge}`}>
            {t(`severity.${report.severity}`)}
          </span>
          {report.needs_rescue && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-600 text-white font-bold animate-breathe">
              SOS
            </span>
          )}
          {report.verified && (
            <span className="text-xs text-emerald-600 dark:text-emerald-500 font-semibold">✓ verified</span>
          )}
        </div>
        <span className="text-slate-400 dark:text-slate-500 text-xs shrink-0 font-mono">{timeAgo}</span>
      </div>

      {/* Location */}
      <p className="text-slate-800 dark:text-slate-200 text-xs font-semibold truncate">
        📍 {report.location || report.county || 'Kenya'}
      </p>

      {/* Details */}
      {(report.water_level || report.infrastructure?.length > 0) && (
        <div className="flex gap-2 mt-1 flex-wrap">
          {report.water_level && <span className="text-slate-400 text-xs">💧 {report.water_level}</span>}
          {report.infrastructure?.map(i => <span key={i} className="text-slate-400 text-xs">🏗️ {i}</span>)}
        </div>
      )}

      {report.raw_message && (
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 italic line-clamp-2">
          "{report.raw_message}"
        </p>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-navy-600/50">
        <span className="text-slate-400 text-xs font-mono">{t(`feed.source.${report.source || 'web'}`)}</span>
        <div className="flex gap-0.5">
          {!report.verified && (
            <button
              onClick={() => onVerify(report.id)}
              className="text-xs text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors px-1.5 py-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-semibold"
              title="Verify report"
            >
              ✓
            </button>
          )}
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-40 font-semibold"
          >
            {resolving ? '...' : t('feed.markResolved')}
          </button>
        </div>
      </div>
    </div>
  )
}
