import { useTranslation } from 'react-i18next'

export default function StatsBar({ stats }) {
  const { t } = useTranslation()

  const items = [
    { label: t('stats.reports24h'),   value: stats.reports_24h,    color: 'text-blue-600 dark:text-blue-400',   icon: '📊' },
    { label: t('stats.rescueNeeded'), value: stats.rescue_needed,   color: 'text-red-600 dark:text-red-400',    icon: '🆘' },
    { label: t('stats.critical'),     value: stats.critical_active, color: 'text-orange-600 dark:text-orange-400', icon: '⚠️' },
    { label: t('stats.resolved'),     value: stats.resolved_24h ?? 0,               color: 'text-green-600 dark:text-green-400', icon: '✅' },
  ]

  return (
    <div className="flex gap-1 sm:gap-3">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg px-2 sm:px-3 py-1.5">
          <span className="text-sm hidden sm:block">{item.icon}</span>
          <div>
            <p className={`text-lg font-bold leading-none ${item.color}`}>{item.value}</p>
            <p className="text-gray-500 dark:text-gray-500 text-xs hidden sm:block">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
