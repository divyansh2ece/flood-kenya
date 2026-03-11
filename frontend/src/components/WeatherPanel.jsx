import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const API = import.meta.env.VITE_API_BASE_URL

const RISK = {
  low:      { bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', label: 'Low Risk'     },
  moderate: { bar: 'bg-yellow-500',  text: 'text-yellow-700 dark:text-yellow-400',   bg: 'bg-yellow-50 dark:bg-yellow-900/20',   border: 'border-yellow-200 dark:border-yellow-800',   label: 'Moderate Risk' },
  high:     { bar: 'bg-red-500',     text: 'text-red-700 dark:text-red-400',          bg: 'bg-red-50 dark:bg-red-900/20',          border: 'border-red-200 dark:border-red-800',          label: 'High Risk'     },
  unknown:  { bar: 'bg-slate-400',   text: 'text-slate-500',                           bg: 'bg-slate-50 dark:bg-navy-700',          border: 'border-slate-200 dark:border-navy-600',      label: 'Unknown'       },
}

const COUNTIES = [
  'Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Kisii','Nyeri','Meru',
  'Kakamega','Machakos','Kilifi','Kwale','Kitui','Garissa','Turkana',
  'Mandera','Wajir','Marsabit','Isiolo','Lamu','Kajiado','Makueni',
  'Narok','Migori','Homa Bay','Siaya','Vihiga','Bungoma','Busia',
  'Embu','Kirinyaga','Kiambu','Baringo','Kericho','Bomet','Nandi',
]

export default function WeatherPanel() {
  const { t } = useTranslation()
  const [county,  setCounty]  = useState('Nairobi')
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchWeather = async (c) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/weather/${encodeURIComponent(c)}`)
      if (!res.ok) throw new Error()
      setWeather(await res.json())
    } catch {
      setWeather(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWeather(county) }, [county])

  const risk = RISK[weather?.flood_risk] || RISK.unknown
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
        {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
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
        <div className="text-center py-6">
          <p className="text-slate-400 text-xs">Weather data unavailable</p>
        </div>
      )}
    </div>
  )
}
