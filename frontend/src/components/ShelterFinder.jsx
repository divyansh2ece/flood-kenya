import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const API = import.meta.env.VITE_API_BASE_URL

const TYPE_ICONS = {
  hospital: '🏥', school: '🏫', church: '⛪', camp: '⛺', shelter: '🏠',
}

const KENYA_LOCATIONS = [
  'Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Kisii','Nyeri','Meru',
  'Kakamega','Machakos','Kilifi','Garissa','Turkana','Narok','Migori',
  'Homa Bay','Siaya','Bungoma','Busia','Kajiado','Kiambu','Kericho',
  'Westlands','Kibera','Eastleigh','Kasarani','Thika','Ruiru',
]

async function geocodeKenya(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Kenya')}&format=json&limit=1&countrycodes=ke`,
      { headers: { 'User-Agent': 'FloodWatchKenya/1.0' } }
    )
    const data = await res.json()
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch { /* silent */ }
  return null
}

export default function ShelterFinder({ shelters: mapShelters, clickedCoords }) {
  const { t } = useTranslation()
  const [searchText,  setSearchText]  = useState('')
  const [shelters,    setShelters]    = useState([])
  const [sourceLabel, setSourceLabel] = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [suggestions, setSuggestions] = useState([])

  // ── FIX: sync map-click results via useEffect (not during render) ──
  useEffect(() => {
    if (clickedCoords && mapShelters) {
      setShelters(mapShelters)
      setSourceLabel('📍 From map click')
      setError(null)
    }
  }, [clickedCoords, mapShelters])

  const fetchByCoords = async (lat, lng, label) => {
    setLoading(true)
    setError(null)
    setSourceLabel(label)
    try {
      const res = await fetch(`${API}/shelters/nearby?lat=${lat}&lng=${lng}&limit=5`)
      if (!res.ok) throw new Error()
      setShelters(await res.json())
    } catch {
      setError('Could not load shelters.')
      setShelters([])
    } finally {
      setLoading(false)
    }
  }

  const handleGPS = () => {
    if (!navigator.geolocation) { setError('GPS not available.'); return }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude, '📡 Your GPS location'),
      () => { setLoading(false); setError('Location denied. Please type your area.') }
    )
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchText.trim()) return
    setLoading(true)
    setError(null)
    setSuggestions([])
    const coords = await geocodeKenya(searchText)
    if (coords) {
      await fetchByCoords(coords.lat, coords.lng, `📍 ${searchText}`)
    } else {
      setLoading(false)
      setError(`Could not find "${searchText}" in Kenya.`)
    }
  }

  const onInputChange = (val) => {
    setSearchText(val)
    if (val.length >= 2) {
      setSuggestions(KENYA_LOCATIONS.filter(l => l.toLowerCase().startsWith(val.toLowerCase())).slice(0, 5))
    } else {
      setSuggestions([])
    }
  }

  return (
    <div>
      <p className="text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase mb-3">{t('shelters.title')}</p>

      {/* GPS button */}
      <button
        onClick={handleGPS}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-semibold py-2.5 rounded-lg transition-colors mb-2 disabled:opacity-50"
      >
        <span>📡</span> Use my GPS location
      </button>

      {/* Text search */}
      <form onSubmit={handleSearch} className="relative mb-2.5">
        <div className="flex gap-1.5">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchText}
              onChange={e => onInputChange(e.target.value)}
              placeholder="Type town or county..."
              className="w-full bg-white dark:bg-navy-700 border border-slate-200 dark:border-navy-600 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-400"
            />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white dark:bg-navy-700 border border-slate-200 dark:border-navy-600 rounded-lg shadow-lg z-20 mt-0.5 overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s} type="button"
                    onClick={() => { setSearchText(s); setSuggestions([]) }}
                    className="w-full text-left text-xs px-3 py-2 hover:bg-slate-50 dark:hover:bg-navy-600 text-slate-600 dark:text-slate-300"
                  >
                    📍 {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !searchText.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors disabled:opacity-40 shrink-0"
          >
            {loading ? '⏳' : '🔍'}
          </button>
        </div>
      </form>

      {/* Status */}
      {error && <p className="text-red-500 dark:text-red-400 text-xs mb-2">{error}</p>}
      {sourceLabel && !loading && <p className="text-slate-400 text-xs mb-2">{sourceLabel}</p>}

      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Shelter results */}
      {!loading && shelters.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {shelters.map(s => (
            <div key={s.id} className="bg-white dark:bg-navy-700 border border-slate-200 dark:border-navy-600 rounded-lg p-2.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm shrink-0">{TYPE_ICONS[s.type] || '🏠'}</span>
                  <p className="text-slate-800 dark:text-slate-200 text-xs font-semibold leading-tight truncate">{s.name}</p>
                </div>
                <span className="text-blue-600 dark:text-blue-400 text-xs font-mono font-bold shrink-0 ml-2">{s.distance_km}km</span>
              </div>
              {s.contact && (
                <a href={`tel:${s.contact}`} className="mt-1.5 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs hover:underline">
                  📞 {s.contact}
                </a>
              )}
              {s.capacity && (
                <p className="text-slate-400 text-xs mt-0.5">👥 {s.capacity} people</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && shelters.length === 0 && !error && (
        <div className="text-center py-6 border border-dashed border-slate-200 dark:border-navy-600 rounded-lg">
          <p className="text-2xl mb-1.5">🗺️</p>
          <p className="text-slate-400 text-xs">{t('shelters.clickMap')}</p>
        </div>
      )}

      {/* Red Cross always visible */}
      <div className="mt-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-2.5">
        <p className="text-red-700 dark:text-red-300 text-xs font-bold mb-0.5">🆘 Kenya Red Cross</p>
        <a href="tel:0800723000" className="text-red-600 dark:text-red-300 text-sm font-mono font-bold hover:underline">0800 723 000</a>
        <p className="text-red-400 text-xs">{t('emergency.toll')}</p>
      </div>
    </div>
  )
}
