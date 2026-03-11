import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const API = import.meta.env.VITE_API_BASE_URL

const TYPE_ICONS = {
  hospital: '🏥', school: '🏫', church: '⛪', camp: '⛺', shelter: '🏠',
}

// Kenya towns/areas for suggestions
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
  const [shelters,    setShelters]    = useState(mapShelters || [])
  const [source,      setSource]      = useState(clickedCoords ? 'map' : null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [suggestions, setSuggestions] = useState([])

  // If map click updated, sync
  if (clickedCoords && source !== 'map' && mapShelters !== shelters && mapShelters?.length) {
    setShelters(mapShelters)
    setSource('map')
  }

  const fetchByCoords = async (lat, lng, label) => {
    setLoading(true)
    setError(null)
    setSource(label)
    try {
      const res = await fetch(`${API}/shelters/nearby?lat=${lat}&lng=${lng}&limit=5`)
      if (!res.ok) throw new Error()
      setShelters(await res.json())
    } catch {
      setError('Could not load shelters. / Imeshindwa kupata makazi.')
      setShelters([])
    } finally {
      setLoading(false)
    }
  }

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setError('GPS not available in this browser.')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude, 'gps'),
      ()  => { setLoading(false); setError('Location access denied. Please type your location.') }
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
      await fetchByCoords(coords.lat, coords.lng, `"${searchText}"`)
    } else {
      setLoading(false)
      setError(`Could not find "${searchText}" in Kenya. Try a county or town name.`)
    }
  }

  const handleSuggestion = (loc) => {
    setSearchText(loc)
    setSuggestions([])
  }

  const onInputChange = (val) => {
    setSearchText(val)
    if (val.length >= 2) {
      const matches = KENYA_LOCATIONS.filter(l =>
        l.toLowerCase().startsWith(val.toLowerCase())
      ).slice(0, 5)
      setSuggestions(matches)
    } else {
      setSuggestions([])
    }
  }

  const sourceLabel = {
    'map': '📍 From map click',
    'gps': '📡 From your GPS',
  }[source] || (source ? `📍 ${source}` : null)

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('shelters.title')}</h2>

      {/* GPS button */}
      <button
        onClick={handleGPS}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold py-2 rounded-lg transition-colors mb-2 disabled:opacity-50"
      >
        📡 Use my location / Tumia eneo langu
      </button>

      {/* Text search */}
      <form onSubmit={handleSearch} className="relative mb-2">
        <div className="flex gap-1.5">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchText}
              onChange={e => onInputChange(e.target.value)}
              placeholder="Type town or county / Andika mji..."
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500"
            />
            {/* Autocomplete dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 mt-0.5 overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSuggestion(s)}
                    className="w-full text-left text-xs px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
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
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 shrink-0"
          >
            {loading ? '⏳' : '🔍'}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <p className="text-red-500 dark:text-red-400 text-xs mb-2">{error}</p>
      )}

      {/* Source label */}
      {sourceLabel && !loading && (
        <p className="text-gray-400 text-xs mb-2">{sourceLabel}</p>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Shelter results */}
      {!loading && shelters.length > 0 && (
        <div className="flex flex-col gap-2">
          {shelters.map(s => (
            <div key={s.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5">
                  <span>{TYPE_ICONS[s.type] || '🏠'}</span>
                  <p className="text-gray-800 dark:text-gray-200 text-xs font-medium leading-tight">{s.name}</p>
                </div>
                <span className="text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0 ml-2">
                  {s.distance_km} {t('shelters.km')}
                </span>
              </div>
              {s.contact && (
                <a href={`tel:${s.contact}`} className="mt-1.5 flex items-center gap-1 text-green-600 dark:text-green-400 text-xs hover:underline">
                  📞 {s.contact}
                </a>
              )}
              {s.capacity && (
                <p className="text-gray-400 text-xs mt-0.5">👥 {s.capacity} {t('shelters.capacity')}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !shelters.length && !error && (
        <p className="text-gray-400 dark:text-gray-500 text-xs text-center py-3 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          🗺️ {t('shelters.clickMap')}
        </p>
      )}

      {/* Always show Red Cross */}
      <div className="mt-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg p-2.5">
        <p className="text-red-700 dark:text-red-300 text-xs font-semibold">🆘 Kenya Red Cross</p>
        <a href="tel:0800723000" className="text-red-600 dark:text-red-200 text-sm font-bold hover:underline">
          0800 723 000
        </a>
        <p className="text-red-400 text-xs">{t('emergency.toll')}</p>
      </div>
    </div>
  )
}
