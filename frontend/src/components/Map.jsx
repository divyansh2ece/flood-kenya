import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'

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

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => onMapClick(e.latlng.lat, e.latlng.lng),
  })
  return null
}

export default function Map({ reports, onMapClick, selectedReport }) {
  const { t } = useTranslation()

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

      {reports
        .filter(r => r.lat && r.lng && !r.resolved)
        .map(report => (
          <CircleMarker
            key={report.id}
            center={[report.lat, report.lng]}
            radius={SEVERITY_RADIUS[report.severity] || 10}
            pathOptions={{
              color:       SEVERITY_COLORS[report.severity] || '#888',
              fillColor:   SEVERITY_COLORS[report.severity] || '#888',
              fillOpacity: report.severity >= 4 ? 0.9 : 0.7,
              weight:      report.needs_rescue ? 3 : 1,
              dashArray:   report.needs_rescue ? '6 3' : null,
            }}
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
                  📍 {report.location || report.county || 'Kenya'}
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
                  {' · '}
                  {t(`feed.source.${report.source || 'web'}`)}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))
      }
    </MapContainer>
  )
}
