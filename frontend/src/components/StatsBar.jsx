import { useTranslation } from 'react-i18next'

export default function StatsBar({ stats }) {
  const { t } = useTranslation()

  const items = [
    { label: '24h Reports',   value: stats.reports_24h,      color: 'text-blue-600 dark:text-blue-400',    dot: 'bg-blue-500' },
    { label: 'Need Rescue',   value: stats.rescue_needed,    color: 'text-red-600 dark:text-red-400',      dot: 'bg-red-500'  },
    { label: 'Critical',      value: stats.critical_active,  color: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
    { label: 'Resolved',      value: stats.resolved_24h ?? 0, color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  ]

  return (
    <div className="flex gap-1 sm:gap-2">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5 bg-slate-50 dark:bg-navy-700 border border-slate-200 dark:border-navy-600 rounded-lg px-2 sm:px-2.5 py-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dot} ${item.dot === 'bg-red-500' && item.value > 0 ? 'animate-breathe' : ''}`} />
          <div>
            <p className={`text-base sm:text-lg font-mono font-bold leading-none tracking-tight ${item.color}`}>{item.value}</p>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider hidden sm:block">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
