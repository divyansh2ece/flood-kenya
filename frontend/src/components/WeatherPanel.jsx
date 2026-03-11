import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

// County coordinates — direct Open-Meteo call from browser (no backend hop)
const COUNTY_COORDS = {
  'Nairobi':   { lat: -1.2921,  lng: 36.8219 },
  'Mombasa':   { lat: -4.0435,  lng: 39.6682 },
  'Kisumu':    { lat: -0.1022,  lng: 34.7617 },
  'Nakuru':    { lat: -0.3031,  lng: 36.0800 },
  'Eldoret':   { lat:  0.5143,  lng: 35.2698 },
  'Kisii':     { lat: -0.6698,  lng: 34.7679 },
  'Nyeri':     { lat: -0.4167,  lng: 36.9500 },
  'Meru':      { lat:  0.0460,  lng: 37.6490 },
  'Kakamega':  { lat:  0.2827,  lng: 34.7519 },
  'Machakos':  { lat: -1.5177,  lng: 37.2634 },
  'Kilifi':    { lat: -3.6305,  lng: 39.8499 },
  'Kwale':     { lat: -4.1730,  lng: 39.4506 },
  'Kitui':     { lat: -1.3667,  lng: 37.9833 },
  'Garissa':   { lat: -0.4532,  lng: 42.0000 },
  'Turkana':   { lat:  3.1179,  lng: 35.5956 },
  'Mandera':   { lat:  3.9373,  lng: 41.8569 },
  'Wajir':     { lat:  1.7471,  lng: 40.0573 },
  'Marsabit':  { lat:  2.3284,  lng: 37.9899 },
  'Isiolo':    { lat:  0.3541,  lng: 38.0006 },
  'Lamu':      { lat: -2.2694,  lng: 40.9022 },
  'Kajiado':   { lat: -1.8516,  lng: 36.7820 },
  'Makueni':   { lat: -2.2585,  lng: 37.8942 },
  'Narok':     { lat: -1.0833,  lng: 36.0833 },
  'Migori':    { lat: -1.0634,  lng: 34.4731 },
  'Homa Bay':  { lat: -0.5273,  lng: 34.4571 },
  'Siaya':     { lat:  0.0611,  lng: 34.2881 },
  'Vihiga':    { lat:  0.0833,  lng: 34.7167 },
  'Bungoma':   { lat:  0.5635,  lng: 34.5606 },
  'Busia':     { lat:  0.4608,  lng: 34.1117 },
  'Embu':      { lat: -0.5333,  lng: 37.4500 },
  'Kirinyaga': { lat: -0.6594,  lng: 37.3822 },
  'Kiambu':    { lat: -1.0311,  lng: 36.8309 },
  'Baringo':   { lat:  0.4667,  lng: 35.9667 },
  'Kericho':   { lat: -0.3667,  lng: 35.2833 },
  'Bomet':     { lat: -0.7833,  lng: 35.3333 },
  'Nandi':     { lat:  0.1833,  lng: 35.1167 },
}

const RISK = {
  low:      { bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', label: 'Low Risk'     },
  moderate: { bar: 'bg-yellow-500',  text: 'text-yellow-700 dark:text-yellow-400',   bg: 'bg-yellow-50 dark:bg-yellow-900/20',   border: 'border-yellow-200 dark:border-yellow-800',   label: 'Moderate Risk' },
  high:     { bar: 'bg-red-500',     text: 'text-red-700 dark:text-red-400',          bg: 'bg-red-50 dark:bg-red-900/20',          border: 'border-red-200 dark:border-red-800',          label: 'High Risk'     },
  unknown:  { bar: 'bg-slate-400',   text: 'text-slate-500',                           bg: 'bg-slate-50 dark:bg-navy-700',          border: 'border-slate-200 dark:border-navy-600',      label: 'Unknown'       },
}

function classifyRisk(mm) {
  if (mm >= 20)  return 'high'
  if (mm >= 7.5) return 'moderate'
  return 'low'
}

export default function WeatherPanel() {
  const { t } = useTranslation()
  const [county,  setCounty]  = useState('Nairobi')
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(false)

  const fetchWeather = async (c) => {
    const coords = COUNTY_COORDS[c]
    if (!coords) return

    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams({
        latitude:      coords.lat,
        longitude:     coords.lng,
        current:       'precipitation,wind_speed_10m,weather_code',
        hourly:        'precipitation,precipitation_probability',
        forecast_days: 1,
        timezone:      'Africa/Nairobi',
      })
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const current        = data.current || {}
      const currentRainfall = parseFloat(current.precipitation ?? 0)
      const currentWind     = parseFloat(current.wind_speed_10m ?? 0)

      const hourly   = data.hourly || {}
      const times    = hourly.time || []
      const precip   = hourly.precipitation || []
      const prob     = hourly.precipitation_probability || []

      const currentTimeStr = current.time || ''
      let currentIdx = 0
      if (currentTimeStr && times.length) {
        const idx = times.indexOf(currentTimeStr)
        if (idx >= 0) currentIdx = idx
      }

      const forecast = []
      for (let i = currentIdx; i < Math.min(currentIdx + 6, times.length); i++) {
        forecast.push({
          time:                      times[i],
          precipitation_mm:          precip[i] ?? 0,
          precipitation_probability: prob[i]   ?? 0,
        })
      }

      setWeather({
        county,
        current_rainfall_mm: currentRainfall,
        current_wind_kmh:    currentWind,
        flood_risk:          classifyRisk(currentRainfall),
        hourly_forecast:     forecast,
      })
    } catch {
      setError(true)
      setWeather(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWeather(county) }, [county])

  const risk     = RISK[weather?.flood_risk] || RISK.unknown
  const rainfall = weather?.current_rainfall_mm ?? null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">{t('weather.title')}</p>
        {weather && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${risk.bg} ${risk.border} ${risk.text}`}>{risk.label}</span>}
      </div>

      {/* County selector */}
      <select
        value={county}
        onChange={e => setCounty(e.target.value)}
        className="w-full bg-white dark:bg-navy-700 border border-slate-200 dark:border-navy-600 text-slate-700 dark:text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 font-medium"
      >
        {Object.keys(COUNTY_COORDS).map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {loading ? (
        <div className="flex items-center justify-center h-20">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : weather ? (
        <>
          {/* Rainfall card */}
          <div className={`rounded-xl border p-3.5 ${risk.bg} ${risk.border}`}>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wider">Current Rainfall</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-mono font-bold ${risk.text}`}>
                    {rainfall !== null ? rainfall.toFixed(1) : '--'}
                  </span>
                  <span className="text-slate-400 text-xs">mm/hr</span>
                </div>
                {weather.current_wind_kmh > 0 && (
                  <p className="text-slate-400 text-xs mt-1">💨 {weather.current_wind_kmh.toFixed(1)} km/h wind</p>
                )}
              </div>
              <div className="text-right">
                <div className={`w-3 h-8 rounded-full ${risk.bar} opacity-80`} />
              </div>
            </div>
          </div>

          {rainfall === 0 && (
            <p className="text-xs text-slate-400 text-center -mt-1">No active rainfall in {county}</p>
          )}

          {/* 6-hour forecast */}
          {weather.hourly_forecast?.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Next 6 Hours</p>
              <div className="grid grid-cols-3 gap-1">
                {weather.hourly_forecast.slice(0, 6).map((h, i) => {
                  const time = h.time?.split('T')[1]?.slice(0, 5) || `+${i+1}h`
                  const mm   = typeof h.precipitation_mm === 'number' ? h.precipitation_mm.toFixed(1) : '0.0'
                  const r    = h.precipitation_mm >= 20 ? RISK.high : h.precipitation_mm >= 7.5 ? RISK.moderate : RISK.low
                  return (
                    <div key={i} className={`rounded-lg p-2 text-center border ${r.bg} ${r.border}`}>
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-mono">{time}</p>
                      <p className={`text-sm font-mono font-bold ${r.text}`}>{mm}</p>
                      <p className="text-slate-400 text-[10px]">mm</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-6 flex flex-col items-center gap-3">
          <p className="text-slate-400 text-xs">{error ? 'Weather data unavailable' : 'No data'}</p>
          {error && (
            <button
              onClick={() => fetchWeather(county)}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  )
}
