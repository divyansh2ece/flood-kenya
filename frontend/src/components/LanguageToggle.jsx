import { useTranslation } from 'react-i18next'

export default function LanguageToggle() {
  const { i18n, t } = useTranslation()

  const toggle = () => {
    i18n.changeLanguage(i18n.language === 'sw' ? 'en' : 'sw')
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
      title="Switch language / Badilisha lugha"
    >
      <span>{i18n.language === 'sw' ? '🇬🇧' : '🇰🇪'}</span>
      <span className="hidden sm:block text-gray-600 dark:text-gray-300 text-xs">{t('switchLang')}</span>
    </button>
  )
}
