import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'
import L from 'leaflet'

const SEVERITY_COLORS = {
  1: '#22c55e',
  2: '#eab308',
  3: '#f97316',
  4: '#ef4444',
  5: '#7f1d1d',
}

const SEVERITY_RADIUS = { 1: 8, 2: 10, 3: 12, 4: 15, 5: 18 }

// Kenya center
const KENYA_CENTER = [-0.023559, 37.906193]
const KENYA_ZOOM   = 6

// Public Kenya county boundaries (geoBoundaries project — ADM1)
const KENYA_GEOJSON_URL =
  'https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/KEN/ADM1/geoBoundaries-KEN-ADM1.geojson'

function createSeverityIcon(severity, needsRescue) {
  const color = SEVERITY_COLORS[severity] || '#888'
  const r     = SEVERITY_RADIUS[severity] || 10
  const size  = r * 2
  const border = needsRescue
    ? `2px dashed #fff`
    : `1.5px solid rgba(255,255,255,0.45)`
  const pulse = needsRescue ? 'animation:pulse 1.4s ease-in-out infinite;' : ''
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:${border};
      opacity:0.88;box-shadow:0 1px 4px rgba(0,0,0,0.35);
      ${pulse}
    "></div>`,
    className: '',
    iconSize:   [size, size],
    iconAnchor: [r, r],
    popupAnchor:[0, -r],
  })
}

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => onMapClick(e.latlng.lat, e.latlng.lng),
  })
  return null
}

const countyStyle = {
  color:       '#3b82f6',
  weight:      1,
  opacity:     0.4,
  fillOpacity: 0,
}

export default function Map({ reports, onMapClick }) {
  const { t } = useTranslation()
  const [countyGeo, setCountyGeo] = useState(null)

  // Fetch Kenya county GeoJSON — optional, fails gracefully
  useEffect(() => {
    fetch(KENYA_GEOJSON_URL)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCountyGeo(data) })
      .catch(() => {})
  }, [])

  const activeReports = reports.filter(r => r.lat && r.lng && !r.resolved)

  return (
    <MapContainer
      center={KENYA_CENTER}
      zoom={KENYA_ZOOM}
      className="w-full h-full"
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
      />

      <ClickHandler onMapClick={onMapClick} />

      {/* Kenya county boundary overlay */}
      {countyGeo && (
        <GeoJSON
          key="kenya-counties"
          data={countyGeo}
          style={countyStyle}
        />
      )}

      {/* Clustered flood markers */}
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={60}
        showCoverageOnHover={false}
        iconCreateFunction={(cluster) => {
          const count = cluster.getChildCount()
          const markers = cluster.getAllChildMarkers()
          // Use highest severity in cluster for cluster icon color
          const maxSev = markers.reduce((m, mk) => Math.max(m, mk.options._severity || 1), 1)
          const color = SEVERITY_COLORS[maxSev] || '#888'
          return L.divIcon({
            html: `<div style="
              width:36px;height:36px;border-radius:50%;
              background:${color};
              border:2px solid rgba(255,255,255,0.6);
              display:flex;align-items:center;justify-content:center;
              color:#fff;font-size:12px;font-weight:bold;
              box-shadow:0 2px 6px rgba(0,0,0,0.4);
              opacity:0.92;
            ">${count}</div>`,
            className: '',
            iconSize:   [36, 36],
            iconAnchor: [18, 18],
          })
        }}
      >
        {activeReports.map(report => (
          <Marker
            key={report.id}
            position={[report.lat, report.lng]}
            icon={createSeverityIcon(report.severity, report.needs_rescue)}
            _severity={report.severity}
          >
            <Popup>
              <div className="text-sm min-w-[180px]">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold text-white"
                    style={{ background: SEVERITY_COLORS[report.severity] }}
                  >
                    {t(`severity.${report.severity}`)}
                  </span>
                  {report.needs_rescue && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-700 text-white animate-pulse">
                      {t('feed.rescue')}
                    </span>
                  )}
                  {report.verified && (
                    <span className="text-green-400 text-xs">✓ {t('feed.verified')}</span>
                  )}
                </div>

                <p className="font-semibold text-white mb-1">
                  📍 {report.location || report.county || 'Unknown location'}
                </p>

                {report.water_level && (
                  <p className="text-gray-300 text-xs mb-1">
                    💧 {t('map.popupWater')}: <strong>{report.water_level}</strong>
                  </p>
                )}

                {report.raw_message && (
                  <p className="text-gray-400 text-xs italic mb-2 border-l-2 border-gray-600 pl-2">
                    "{report.raw_message.slice(0, 120)}"
                  </p>
                )}

                {report.infrastructure?.length > 0 && (
                  <p className="text-gray-300 text-xs mb-1">
                    🏗️ {report.infrastructure.join(', ')}
                  </p>
                )}

                <p className="text-gray-500 text-xs mt-2">
                  🕐 {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  )
}
