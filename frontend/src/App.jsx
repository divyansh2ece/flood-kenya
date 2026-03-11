import { useState, useCallback, useRef } from 'react'
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
const MIN_W = 180
const MAX_W = 440

/**
 * dir='right'  → left sidebar:  drag right edge → delta positive = wider  ✓
 * dir='left'   → right sidebar: drag left edge  → delta positive = narrower,
 *                so we negate the delta to get correct behaviour
 */
function useDragResize(defaultWidth, dir = 'right') {
  const [width, setWidth] = useState(defaultWidth)
  const dragging = useRef(false)
  const startX   = useRef(0)
  const startW   = useRef(defaultWidth)

  const onMouseDown = useCallback((e) => {
    dragging.current = true
    startX.current   = e.clientX
    startW.current   = width
    document.body.style.userSelect = 'none'
    document.body.style.cursor     = 'col-resize'

    const onMove = (ev) => {
      if (!dragging.current) return
      const raw   = ev.clientX - startX.current
      const delta = dir === 'left' ? -raw : raw          // ← fix: negate for right panel
      setWidth(Math.min(MAX_W, Math.max(MIN_W, startW.current + delta)))
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.userSelect = ''
      document.body.style.cursor     = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width, dir])

  return [width, onMouseDown]
}

/** Divider strip that sits between map and a sidebar — holds drag handle + collapse toggle */
function PanelDivider({ side, isOpen, onToggle, onDragStart }) {
  const isLeft = side === 'left'
  return (
    <div className="relative shrink-0 flex items-center justify-center z-20 hidden sm:flex" style={{ width: 12 }}>
      {/* Drag zone — full height, triggers resize */}
      <div
        onMouseDown={onDragStart}
        className="absolute inset-0 cursor-col-resize hover:bg-blue-400/20 transition-colors"
      />
      {/* Visible thin line */}
      <div className="w-px h-full bg-slate-200 dark:bg-navy-600 pointer-events-none" />

      {/* Collapse / expand button — centred pill */}
      <button
        onClick={onToggle}
        className="absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-5 h-9 rounded-md bg-white dark:bg-navy-700 border border-slate-200 dark:border-navy-500 shadow-sm hover:bg-blue-50 dark:hover:bg-navy-600 hover:border-blue-400 dark:hover:border-blue-600 transition-all group"
        title={isOpen ? 'Collapse panel' : 'Expand panel'}
      >
        <span className="text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 text-xs font-bold select-none leading-none" style={{ fontSize: 10 }}>
          {isLeft
            ? (isOpen ? '◂' : '▸')
            : (isOpen ? '▸' : '◂')}
        </span>
      </button>
    </div>
  )
}

export default function App() {
  const { t } = useTranslation()
  const { isDark, toggle: toggleTheme } = useTheme()

  const [hours,          setHours]         = useState(24)
  const [showReport,     setShowReport]     = useState(false)
  const [rightTab,       setRightTab]       = useState('weather')
  const [clickedCoords,  setClickedCoords]  = useState(null)
  const [nearbyShelters, setNearbyShelters] = useState([])
  const [leftOpen,       setLeftOpen]       = useState(true)
  const [rightOpen,      setRightOpen]      = useState(true)

  const [leftWidth,  leftDragHandle]  = useDragResize(240, 'right')
  const [rightWidth, rightDragHandle] = useDragResize(256, 'left')   // ← pass 'left'

  const { reports, stats, loading, resolveReport, verifyReport } = useRealtimeReports(hours)

  const handleMapClick = useCallback(async (lat, lng) => {
    setClickedCoords({ lat, lng })
    setRightTab('shelters')
    if (!rightOpen) setRightOpen(true)
    try {
      const res = await fetch(`${API}/shelters/nearby?lat=${lat}&lng=${lng}&limit=5`)
      if (res.ok) setNearbyShelters(await res.json())
    } catch { setNearbyShelters([]) }
  }, [rightOpen])

  return (
    <div className="flex flex-col h-screen bg-stone-50 dark:bg-navy-900 overflow-hidden">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-3 sm:px-4 py-2 bg-white dark:bg-navy-800 border-b border-slate-200 dark:border-navy-600 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <span className="text-base leading-none">🌊</span>
          </div>
          <div className="hidden sm:block leading-none">
            <p className="text-xs font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase">FloodWatch</p>
            <p className="text-[10px] text-slate-400 tracking-wider">Kenya · Real-time</p>
          </div>
          <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-full px-2 py-0.5">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-breathe" />
            <span className="text-red-600 dark:text-red-400 text-xs font-semibold tracking-wide uppercase">Live</span>
          </div>
        </div>

        <div className="flex-1 flex justify-center">
          <StatsBar stats={stats} />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle isDark={isDark} toggle={toggleTheme} />
          <LanguageToggle />
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold tracking-wide px-3 py-1.5 rounded-lg transition-colors shadow-sm uppercase"
          >
            <span className="text-sm leading-none">+</span>
            <span className="hidden sm:block">{t('report.button')}</span>
          </button>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR */}
        <aside
          className="shrink-0 bg-white dark:bg-navy-800 flex-col overflow-hidden hidden sm:flex"
          style={{ width: leftOpen ? leftWidth : 0, transition: 'width 0.18s ease' }}
        >
          {leftOpen && (
            <div className="flex flex-col h-full" style={{ width: leftWidth, minWidth: leftWidth }}>
              <IncidentFeed
                reports={reports}
                hours={hours}
                setHours={setHours}
                onResolve={resolveReport}
                onVerify={verifyReport}
              />
            </div>
          )}
        </aside>

        {/* LEFT DIVIDER — drag + toggle */}
        <PanelDivider
          side="left"
          isOpen={leftOpen}
          onToggle={() => setLeftOpen(o => !o)}
          onDragStart={leftOpen ? leftDragHandle : undefined}
        />

        {/* CENTER — Map */}
        <main className="flex-1 relative overflow-hidden">
          {loading && reports.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-stone-50/90 dark:bg-navy-900/90 pointer-events-none">
              <div className="flex flex-col items-center gap-3">
                <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 text-xs tracking-wider uppercase">Loading data...</p>
              </div>
            </div>
          )}

          <Map reports={reports} onMapClick={handleMapClick} />

          {/* Map click hint */}
          <div className="map-hint absolute bottom-5 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-navy-800/90 backdrop-blur-sm border border-slate-200 dark:border-navy-500 text-slate-500 dark:text-slate-400 text-xs px-3 py-1.5 rounded-full shadow z-10 pointer-events-none hidden sm:block whitespace-nowrap">
            🗺 Click anywhere on the map to find nearby shelters
          </div>

          {/* Severity legend */}
          <div className="absolute top-2 right-2 bg-white/95 dark:bg-navy-800/95 backdrop-blur-sm border border-slate-200 dark:border-navy-600 rounded-xl p-3 z-10 shadow-md">
            <p className="text-slate-400 dark:text-slate-500 text-[10px] mb-2 font-bold tracking-widest uppercase">Severity</p>
            {[
              { label: t('severity.1'), color: '#22c55e' },
              { label: t('severity.2'), color: '#eab308' },
              { label: t('severity.3'), color: '#f97316' },
              { label: t('severity.4'), color: '#ef4444' },
              { label: t('severity.5'), color: '#7f1d1d' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2 mb-1 last:mb-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-slate-600 dark:text-slate-400 text-xs">{label}</span>
              </div>
            ))}
          </div>

          {/* Mobile incident strip */}
          <div className="sm:hidden absolute bottom-0 left-0 right-0 bg-white dark:bg-navy-800 border-t border-slate-200 dark:border-navy-600 max-h-40 overflow-y-auto thin-scroll z-10">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-navy-700">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('feed.title')} ({reports.filter(r => !r.resolved).length})</p>
            </div>
            {reports.filter(r => !r.resolved).slice(0, 5).map(r => (
              <div key={r.id} className={`px-3 py-2 border-b border-slate-100 dark:border-navy-700/50 flex items-center gap-2 border-l-2 ${r.severity >= 4 ? 'border-l-red-500' : r.severity === 3 ? 'border-l-orange-400' : 'border-l-yellow-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.severity >= 4 ? 'bg-red-500 animate-pulse' : r.severity === 3 ? 'bg-orange-400' : 'bg-yellow-400'}`} />
                <span className="text-slate-700 dark:text-slate-300 text-xs truncate">{r.location || r.county || 'Kenya'}</span>
                {r.needs_rescue && <span className="text-red-500 text-xs font-bold shrink-0 animate-breathe">SOS</span>}
              </div>
            ))}
          </div>
        </main>

        {/* RIGHT DIVIDER — drag + toggle */}
        <PanelDivider
          side="right"
          isOpen={rightOpen}
          onToggle={() => setRightOpen(o => !o)}
          onDragStart={rightOpen ? rightDragHandle : undefined}
        />

        {/* RIGHT SIDEBAR */}
        <aside
          className="shrink-0 bg-white dark:bg-navy-800 flex-col hidden lg:flex overflow-hidden"
          style={{ width: rightOpen ? rightWidth : 0, transition: 'width 0.18s ease' }}
        >
          {rightOpen && (
            <div className="flex flex-col h-full overflow-hidden" style={{ width: rightWidth, minWidth: rightWidth }}>
              {/* Tab bar */}
              <div className="flex border-b border-slate-200 dark:border-navy-600 shrink-0">
                {['weather', 'shelters'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setRightTab(tab)}
                    className={`flex-1 py-2.5 text-xs font-bold tracking-wider uppercase transition-all border-b-2 ${
                      rightTab === tab
                        ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    {tab === 'weather' ? '🌦 Weather' : '🏠 Shelters'}
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
              <div className="p-3 border-t border-slate-200 dark:border-navy-600 bg-slate-50 dark:bg-navy-900/50 shrink-0">
                <p className="text-[10px] text-slate-400 mb-2 font-bold tracking-widest uppercase">{t('emergency.title')}</p>
                <div className="space-y-1.5">
                  <a href="tel:0800723000" className="flex items-center justify-between text-xs group">
                    <span className="text-slate-500 dark:text-slate-400 group-hover:text-red-500 transition-colors">🔴 {t('emergency.redcross')}</span>
                    <span className="text-red-600 dark:text-red-400 font-mono font-bold">0800 723 000</span>
                  </a>
                  <a href="tel:999" className="flex items-center justify-between text-xs group">
                    <span className="text-slate-500 dark:text-slate-400 group-hover:text-orange-500 transition-colors">🚨 {t('emergency.police')}</span>
                    <span className="text-orange-600 dark:text-orange-400 font-mono font-bold">999 / 112</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {showReport && (
        <ReportForm onClose={() => setShowReport(false)} onSuccess={() => {}} />
      )}
    </div>
  )
}
