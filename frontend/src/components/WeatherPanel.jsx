import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const API = import.meta.env.VITE_API_BASE_URL

const RISK_STYLES = {
  low:      { bg: 'bg-green-50 dark:bg-green-900/30',   text: 'text-green-700 dark:text-green-400',  border: 'border-green-200 dark:border-green-800',  icon: '🟢' },
  moderate: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800', icon: '🟡' },
  high:     { bg: 'bg-red-50 dark:bg-red-900/30',       text: 'text-red-700 dark:text-red-400',       border: 'border-red-200 dark:border-red-800',       icon: '🔴' },
  unknown:  { bg: 'bg-gray-100 dark:bg-gray-800',       text: 'text-gray-500',                        border: 'border-gray-200 dark:border-gray-700',     icon: '⚪' },
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

  const risk    = weather?.flood_risk || 'unknown'
  const style   = RISK_STYLES[risk] || RISK_STYLES.unknown
  const rainfall = weather?.current_rainfall_mm ?? null

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('weather.title')}</h2>

      {/* County selector */}
      <select
        value={county}
        onChange={e => setCounty(e.target.value)}
        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500"
      >
        {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {loading ? (
        <div className="flex items-center justify-center h-16">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : weather ? (
        <>
          {/* Current rainfall card */}
          <div className={`rounded-lg border p-3 ${style.bg} ${style.border}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('weather.rainfall')}</p>
                <p className={`text-2xl font-bold ${style.text}`}>
                  {rainfall !== null ? rainfall.toFixed(1) : '--'}
                  <span className="text-sm font-normal ml-1">mm/hr</span>
                </p>
                {weather.current_wind_kmh > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">💨 {weather.current_wind_kmh.toFixed(1)} km/h</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-3xl">{style.icon}</span>
                <p className={`text-xs font-semibold mt-1 ${style.text}`}>
                  {t(`weather.riskLevels.${risk}`)}
                </p>
              </div>
            </div>
          </div>

          {rainfall === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center -mt-1">
              No active rainfall in {county} right now
            </p>
          )}

          {/* 6-hour forecast */}
          {weather.hourly_forecast?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1.5">{t('weather.forecast')}</p>
              <div className="grid grid-cols-3 gap-1">
                {weather.hourly_forecast.slice(0, 6).map((h, i) => {
                  const time = h.time?.split('T')[1]?.slice(0, 5) || `+${i+1}h`
                  const mm   = typeof h.precipitation_mm === 'number' ? h.precipitation_mm.toFixed(1) : '0.0'
                  const r    = h.precipitation_mm >= 20 ? 'high' : h.precipitation_mm >= 7.5 ? 'moderate' : 'low'
                  const s    = RISK_STYLES[r]
                  return (
                    <div key={i} className={`rounded p-1.5 text-center border ${s.bg} ${s.border}`}>
                      <p className="text-gray-500 text-xs">{time}</p>
                      <p className={`text-sm font-semibold ${s.text}`}>{mm}</p>
                      <p className="text-gray-400 text-xs">mm</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-400 text-xs text-center py-4">Weather data unavailable</p>
      )}
    </div>
  )
}
