import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'

const SEV_BADGE = {
  1: 'bg-green-100 text-green-800 border-green-300  dark:bg-green-900 dark:text-green-300 dark:border-green-700',
  2: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700',
  3: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-700',
  4: 'bg-red-100 text-red-800 border-red-300       dark:bg-red-900 dark:text-red-300 dark:border-red-700',
  5: 'bg-red-200 text-red-900 border-red-400        dark:bg-red-950 dark:text-red-200 dark:border-red-600',
}

const SEV_DOT = {
  1: 'bg-green-500',
  2: 'bg-yellow-500',
  3: 'bg-orange-500',
  4: 'bg-red-500',
  5: 'bg-red-600 animate-pulse',
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
      {/* Feed header */}
      <div className="px-3 pt-3 pb-2 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('feed.title')}</h2>
          <span className="text-xs text-gray-400">{filtered.length}</span>
        </div>

        {/* Time filter */}
        <div className="flex gap-1 mb-2">
          {['1', '6', '24'].map(h => (
            <button
              key={h}
              onClick={() => setHours(parseInt(h))}
              className={`flex-1 text-xs py-1 rounded transition-colors ${
                hours === parseInt(h)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
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
              className={`flex-1 text-xs py-1 rounded transition-colors capitalize ${
                filter === f
                  ? 'bg-gray-700 dark:bg-gray-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t(`feed.filters.${f}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Report list */}
      <div className="flex-1 overflow-y-auto thin-scroll">
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">{t('feed.empty')}</p>
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

      {/* Telegram CTA */}
      <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
        <a
          href="https://t.me/flood_kenya_bot"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs py-2 rounded-lg transition-colors"
        >
          <span>✈️</span>
          <span>{t('telegram.cta')}</span>
          <span className="font-mono text-blue-500 dark:text-blue-400">{t('telegram.handle')}</span>
        </a>
      </div>
    </div>
  )
}

function ReportCard({ report, onResolve, onVerify }) {
  const { t } = useTranslation()
  const [resolving, setResolving] = useState(false)

  const handleResolve = async () => {
    setResolving(true)
    await onResolve(report.id)
  }

  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(report.created_at), { addSuffix: true }) }
    catch { return '' }
  })()

  return (
    <div className={`mx-2 my-1.5 rounded-lg border p-2.5 ${
      report.needs_rescue
        ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
        : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
    } shadow-sm`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${SEV_DOT[report.severity]}`} />
          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${SEV_BADGE[report.severity]}`}>
            {t(`severity.${report.severity}`)}
          </span>
          {report.needs_rescue && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-600 text-white font-bold animate-pulse">
              {t('feed.rescue')}
            </span>
          )}
          {report.verified && (
            <span className="text-xs text-green-600 dark:text-green-500">✓</span>
          )}
        </div>
        <span className="text-gray-400 text-xs shrink-0">{timeAgo}</span>
      </div>

      {/* Location */}
      <p className="text-gray-800 dark:text-gray-200 text-sm font-medium mt-1.5">
        📍 {report.location || report.county || 'Kenya'}
      </p>

      {/* Water level + infra */}
      {(report.water_level || (report.infrastructure?.length > 0)) && (
        <div className="flex gap-2 mt-1 flex-wrap">
          {report.water_level && (
            <span className="text-gray-500 text-xs">💧 {report.water_level}</span>
          )}
          {report.infrastructure?.map(i => (
            <span key={i} className="text-gray-400 text-xs">🏗️ {i}</span>
          ))}
        </div>
      )}

      {/* Message preview */}
      {report.raw_message && (
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1.5 italic line-clamp-2">
          "{report.raw_message}"
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-gray-400 text-xs">
          {t(`feed.source.${report.source || 'web'}`)}
        </span>
        <div className="flex gap-1">
          {!report.verified && (
            <button
              onClick={() => onVerify(report.id)}
              className="text-xs text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors px-1.5 py-0.5 rounded hover:bg-green-50 dark:hover:bg-green-900/30"
            >
              ✓
            </button>
          )}
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-40"
          >
            {resolving ? '...' : t('feed.markResolved')}
          </button>
        </div>
      </div>
    </div>
  )
}
