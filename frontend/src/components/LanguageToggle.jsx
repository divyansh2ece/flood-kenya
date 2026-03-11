import { useTranslation } from 'react-i18next'

export default function LanguageToggle() {
  const { i18n } = useTranslation()
  const isSw = i18n.language === 'sw'

  return (
    <button
      onClick={() => i18n.changeLanguage(isSw ? 'en' : 'sw')}
      className="flex items-center gap-1.5 bg-slate-100 dark:bg-navy-700 hover:bg-slate-200 dark:hover:bg-navy-600 border border-slate-200 dark:border-navy-500 rounded-lg px-2 py-1.5 text-xs font-bold tracking-wide transition-colors"
      title="Switch language / Badilisha lugha"
    >
      <span>{isSw ? '🇬🇧' : '🇰🇪'}</span>
      <span className="hidden sm:block text-slate-600 dark:text-slate-300">{isSw ? 'EN' : 'SW'}</span>
    </button>
  )
}
