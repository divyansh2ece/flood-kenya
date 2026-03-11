import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Map            from './components/Map'
import IncidentFeed   from './components/IncidentFeed'
import StatsBar       from './components/StatsBar'
import WeatherPanel   from './components/WeatherPanel'
import ShelterFinder  from './components/ShelterFinder'
import ReportForm     from './components/ReportForm'
import LanguageToggle from './components/LanguageToggle'
import ThemeToggle    from './components/ThemeToggle'
import { useRealtimeReports } from './hooks/useRealtimeReports'
import { useTheme }           from './hooks/useTheme'

const API = import.meta.env.VITE_API_BASE_URL

export default function App() {
  const { t } = useTranslation()
  const { isDark, toggle: toggleTheme } = useTheme()

  const [hours,          setHours]          = useState(24)
  const [showReport,     setShowReport]      = useState(false)
  const [rightTab,       setRightTab]        = useState('weather')
  const [clickedCoords,  setClickedCoords]   = useState(null)
  const [nearbyShelters, setNearbyShelters]  = useState([])

  const { reports, stats, loading, resolveReport, verifyReport } = useRealtimeReports(hours)

  const handleMapClick = useCallback(async (lat, lng) => {
    setClickedCoords({ lat, lng })
    setRightTab('shelters')
    try {
      const res = await fetch(`${API}/shelters/nearby?lat=${lat}&lng=${lng}&limit=3`)
      if (res.ok) setNearbyShelters(await res.json())
    } catch { setNearbyShelters([]) }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">

      {/* ── HEADER ───────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-3 sm:px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0 gap-2 shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xl">🌊</span>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-none">FloodWatch</h1>
            <p className="text-gray-400 text-xs">Kenya</p>
          </div>
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-full px-2 py-0.5 ml-1">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-600 dark:text-red-400 text-xs font-medium">{t('liveIndicator')}</span>
          </div>
        </div>

        {/* Stats */}
        <StatsBar stats={stats} />

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle isDark={isDark} toggle={toggleTheme} />
          <LanguageToggle />
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            <span>+</span>
            <span className="hidden sm:block">{t('report.button')}</span>
          </button>
        </div>
      </header>

      {/* ── MAIN BODY ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR — Incident Feed */}
        <aside className="w-64 lg:w-72 shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col overflow-hidden hidden sm:flex shadow-sm">
          <IncidentFeed
            reports={reports}
            hours={hours}
            setHours={setHours}
            onResolve={resolveReport}
            onVerify={verifyReport}
          />
        </aside>

        {/* CENTER — Map */}
        <main className="flex-1 relative">
          {loading && reports.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-gray-950/80 pointer-events-none">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">Loading flood data...</p>
              </div>
            </div>
          )}

          <Map reports={reports} onMapClick={handleMapClick} />

          {/* Mobile: bottom strip */}
          <div className="sm:hidden absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 max-h-44 overflow-y-auto thin-scroll z-10">
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-500">{t('feed.title')} ({reports.filter(r=>!r.resolved).length})</p>
            </div>
            {reports.filter(r => !r.resolved).slice(0, 5).map(r => (
              <div key={r.id} className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800/50 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${r.severity >= 4 ? 'bg-red-500 animate-pulse' : r.severity === 3 ? 'bg-orange-400' : 'bg-yellow-400'}`} />
                <span className="text-gray-700 dark:text-gray-300 text-xs truncate">{r.location || r.county || 'Kenya'}</span>
                {r.needs_rescue && <span className="text-red-500 text-xs font-bold shrink-0">SOS</span>}
              </div>
            ))}
          </div>

          {/* Map legend */}
          <div className="absolute top-2 right-2 bg-white/95 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-lg p-2 z-10 shadow-md">
            <p className="text-gray-500 text-xs mb-1.5 font-medium">Severity</p>
            {[
              { label: t('severity.1'), color: '#22c55e' },
              { label: t('severity.2'), color: '#eab308' },
              { label: t('severity.3'), color: '#f97316' },
              { label: t('severity.4'), color: '#ef4444' },
              { label: t('severity.5'), color: '#7f1d1d' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5 mb-0.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-gray-600 dark:text-gray-400 text-xs">{label}</span>
              </div>
            ))}
          </div>
        </main>

        {/* RIGHT PANEL — Weather + Shelters */}
        <aside className="w-64 shrink-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex-col hidden lg:flex shadow-sm">
          {/* Tab switcher */}
          <div className="flex border-b border-gray-200 dark:border-gray-800 shrink-0">
            {['weather', 'shelters'].map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  rightTab === tab
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'weather' ? `🌦 ${t('weather.title')}` : `🏠 ${t('shelters.title')}`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto thin-scroll p-3">
            {rightTab === 'weather'
              ? <WeatherPanel />
              : <ShelterFinder shelters={nearbyShelters} clickedCoords={clickedCoords} />
            }
          </div>

          {/* Emergency strip */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 shrink-0">
            <p className="text-xs text-gray-400 mb-1.5">{t('emergency.title')}</p>
            <div className="space-y-1">
              <a href="tel:0800723000" className="flex items-center justify-between text-xs hover:opacity-80 transition-opacity">
                <span className="text-gray-600 dark:text-gray-400">🔴 {t('emergency.redcross')}</span>
                <span className="text-red-600 dark:text-red-400 font-mono font-bold">0800 723 000</span>
              </a>
              <a href="tel:999" className="flex items-center justify-between text-xs hover:opacity-80 transition-opacity">
                <span className="text-gray-600 dark:text-gray-400">🚨 {t('emergency.police')}</span>
                <span className="text-orange-600 dark:text-orange-400 font-mono font-bold">999 / 112</span>
              </a>
            </div>
          </div>
        </aside>
      </div>

      {/* ── REPORT MODAL ─────────────────────────────────────── */}
      {showReport && (
        <ReportForm onClose={() => setShowReport(false)} onSuccess={() => {}} />
      )}
    </div>
  )
}
