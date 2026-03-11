export default function ThemeToggle({ isDark, toggle }) {
  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-navy-700 hover:bg-slate-200 dark:hover:bg-navy-600 border border-slate-200 dark:border-navy-500 rounded-lg transition-colors text-sm"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
