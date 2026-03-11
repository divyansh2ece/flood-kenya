export default function ThemeToggle({ isDark, toggle }) {
  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm transition-colors"
    >
      <span>{isDark ? '☀️' : '🌙'}</span>
      <span className="hidden sm:block text-gray-600 dark:text-gray-300 text-xs">
        {isDark ? 'Light' : 'Dark'}
      </span>
    </button>
  )
}
