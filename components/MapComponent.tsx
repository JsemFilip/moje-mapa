"use client"
import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Edit3, Trash2, ChevronDown, Phone } from 'lucide-react'

export type LocationItem = {
  id: string
  barva?: string
  ic_rc?: string
  nazev?: string
  adresa?: string
  firma?: string
  sleva?: string
  hwb?: string
  kontaktni_osoba?: string
  kontaktni_telefon?: string
  co_jsem_delal?: string
  kdy_delal?: string
  co_chci?: string
  kdy_chci?: string
  moje_poznamky?: string
  moje_fotka?: string
  lat: number
  lng: number
}

export type MapBounds = {
  south: number
  west: number
  north: number
  east: number
}

const COLOR_MAP: { [key: string]: string } = {
  'fialová': '#a855f7',
  'červená': '#ef4444',
  'zelená': '#22c55e',
  'modrá': '#3b82f6',
  'žlutá': '#eab308',
  'oranžová': '#f97316',
  'tyrkysová': '#06b6d4',
  'růžová': '#ec4899',
  'šedá': '#71717a'
}

const resolveColorToHex = (colorStr: string): string => {
  const trimmed = colorStr.trim()
  if (trimmed.startsWith('#')) return trimmed
  return COLOR_MAP[trimmed.toLowerCase()] || '#a855f7'
}

const parseColorsToHexArray = (colorString?: string): string[] => {
  if (!colorString) return ['#a855f7']
  const parts = colorString.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return ['#a855f7']
  return parts.map(resolveColorToHex)
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`
  }
  return dateStr
}

const createPizzaIcon = (colorString?: string) => {
  const colors = parseColorsToHexArray(colorString)
  let bg = colors[0]

  if (colors.length === 2) {
    bg = `conic-gradient(${colors[0]} 0% 50%, ${colors[1]} 50% 100%)`
  } else if (colors.length === 3) {
    bg = `conic-gradient(${colors[0]} 0% 33.33%, ${colors[1]} 33.33% 66.66%, ${colors[2]} 66.66% 100%)`
  } else if (colors.length >= 4) {
    bg = `conic-gradient(${colors[0]} 0% 25%, ${colors[1]} 25% 50%, ${colors[2]} 50% 75%, ${colors[3]} 75% 100%)`
  }

  const html = `
    <div style="
      width: 24px; 
      height: 24px; 
      border-radius: 50%; 
      background: ${bg}; 
      border: 2.5px solid white; 
      box-shadow: 0 3px 6px rgba(0,0,0,0.6);
    "></div>
  `
  
  return L.divIcon({
    className: "custom-pizza-marker bg-transparent border-0",
    html: html,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14]
  })
}

const getUserLocationIcon = () => {
  return L.divIcon({
    className: "user-location-marker bg-transparent border-0 pointer-events-none",
    html: `
      <div class="relative flex items-center justify-center w-8 h-8 pointer-events-none">
        <div class="absolute inline-flex w-full h-full rounded-full bg-blue-500 opacity-40 animate-ping"></div>
        <div class="relative inline-flex rounded-full w-4 h-4 bg-blue-600 border-2 border-white shadow-lg"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  })
}

function MapController({ 
  position, 
  targetPosition,
  centerTrigger,
  activeLocationId,
  markerRefs
}: { 
  position: [number, number] | null, 
  targetPosition?: [number, number] | null,
  centerTrigger: number,
  activeLocationId?: string | null,
  markerRefs: React.MutableRefObject<{ [key: string]: L.Marker | null }>
}) {
  const map = useMap()
  const hasCenteredInitial = useRef(false)
  const positionRef = useRef(position)
  positionRef.current = position

  useEffect(() => {
    if (targetPosition) {
      map.flyTo(targetPosition, 16, { duration: 1.1 })

      const openPopupSafely = () => {
        if (activeLocationId) {
          const marker = markerRefs.current[activeLocationId]
          if (marker && typeof marker.openPopup === 'function') {
            marker.openPopup()
          }
        }
      }

      map.once('moveend', openPopupSafely)
      const timer = setTimeout(openPopupSafely, 1200)

      return () => {
        map.off('moveend', openPopupSafely)
        clearTimeout(timer)
      }
    }
  }, [targetPosition, activeLocationId, map, markerRefs])

  useEffect(() => {
    if (centerTrigger > 0 && positionRef.current) {
      map.flyTo(positionRef.current, 15, { duration: 1 })
    }
  }, [centerTrigger, map])

  useEffect(() => {
    if (position && !hasCenteredInitial.current) {
      hasCenteredInitial.current = true
      map.flyTo(position, 13)
    }
  }, [position, map])

  return position === null ? null : (
    <Marker position={position} icon={getUserLocationIcon()} interactive={false} />
  )
}

function BoundsHandler({ onBoundsChange }: { onBoundsChange?: (b: MapBounds) => void }) {
  const map = useMapEvents({
    moveend: () => updateBounds(),
    zoomend: () => updateBounds(),
  })

  const updateBounds = () => {
    if (!onBoundsChange) return
    const b = map.getBounds()
    onBoundsChange({
      south: b.getSouth(),
      west: b.getWest(),
      north: b.getNorth(),
      east: b.getEast(),
    })
  }

  useEffect(() => {
    updateBounds()
  }, [map])

  return null
}

export default function MapComponent({ 
  locations = [], 
  onSelectLocation, 
  onDeleteLocation,
  targetPosition, 
  onBoundsChange,
  centerTrigger = 0,
  activeLocationId = null
}: { 
  locations?: LocationItem[], 
  onSelectLocation?: (loc: LocationItem) => void,
  onDeleteLocation?: (id: string) => void,
  targetPosition?: [number, number] | null,
  onBoundsChange?: (bounds: MapBounds) => void,
  centerTrigger?: number,
  activeLocationId?: string | null
}) {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [expandedPopupId, setExpandedPopupId] = useState<string | null>(null)
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({})

  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
        () => setPosition([50.0755, 14.4378])
      )
      
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setPosition([pos.coords.latitude, pos.coords.longitude])
      )
      return () => navigator.geolocation.clearWatch(watchId)
    } else {
      setPosition([50.0755, 14.4378])
    }
  }, [])

  if (!position) {
    return (
      <div className="h-full w-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 font-medium">
        Zjišťování polohy...
      </div>
    )
  }

  return (
    <div className="relative h-full w-full z-0 bg-slate-100">
      <style>{`
        .custom-dark-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          border: none !important;
          border-radius: 0.75rem !important;
        }
        .custom-dark-popup .leaflet-popup-content {
          margin: 0 !important;
          line-height: inherit !important;
          width: 290px !important;
        }
        .custom-dark-popup .leaflet-popup-content p {
          margin: 0 !important;
        }
        .custom-dark-popup .leaflet-popup-tip-container {
          margin-top: -1px !important;
        }
        .custom-dark-popup .leaflet-popup-tip {
          background: #09090b !important;
          border-left: 1px solid rgba(63, 63, 70, 0.8) !important;
          border-bottom: 1px solid rgba(63, 63, 70, 0.8) !important;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.7) !important;
        }
        .custom-dark-popup .leaflet-popup-close-button {
          display: none !important;
        }
        .custom-dark-popup a {
          color: inherit !important;
          text-decoration: none !important;
        }
      `}</style>

      {/* MapContainer: ponecháno výchozí chování (klik mimo bublinu ji ihned zavře) */}
      <MapContainer 
        center={position} 
        zoom={13} 
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <MapController 
          position={position} 
          targetPosition={targetPosition} 
          centerTrigger={centerTrigger} 
          activeLocationId={activeLocationId}
          markerRefs={markerRefs}
        />
        <BoundsHandler onBoundsChange={onBoundsChange} />

        {locations.map((loc) => {
          const locColors = parseColorsToHexArray(loc.barva)
          const isExpanded = expandedPopupId === loc.id

          return (
            <Marker 
              key={loc.id} 
              ref={(ref) => { if (ref) markerRefs.current[loc.id] = ref }}
              position={[loc.lat, loc.lng]} 
              icon={createPizzaIcon(loc.barva)}
            >
              {/* autoPan={false}: zabrání tomu, aby se mapa při posunu kousala a vracela zpět */}
              <Popup 
                className="custom-dark-popup" 
                maxWidth={310} 
                minWidth={280}
                autoPan={false}
              >
                <div className="p-3 bg-zinc-950/95 text-zinc-100 rounded-xl border border-zinc-800/80 shadow-2xl flex gap-3 relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 opacity-90 flex flex-col">
                    {locColors.map((c, i) => (
                      <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>

                  <div className="flex-1 pl-1">
                    {/* Záhlaví s názvem a pouze ikonkami tužky a koše (bez křížku) */}
                    <div className="flex justify-between items-start mb-1 pr-1">
                      <h3 className="font-bold text-xs text-zinc-100">{loc.nazev || 'Bez názvu'}</h3>
                      <div className="flex gap-1 items-center">
                        <button 
                          type="button"
                          onClick={(e) => { 
                            e.stopPropagation() 
                            if (onSelectLocation) onSelectLocation(loc) 
                          }} 
                          className="p-1 hover:text-purple-400 bg-zinc-800/80 hover:bg-zinc-700 rounded cursor-pointer transition-colors text-zinc-300" 
                          title="Upravit"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { 
                            e.stopPropagation() 
                            const marker = markerRefs.current[loc.id]
                            if (marker) marker.closePopup()
                            if (onDeleteLocation) onDeleteLocation(loc.id) 
                          }} 
                          className="p-1 hover:text-red-400 bg-zinc-800/80 hover:bg-zinc-700 rounded cursor-pointer transition-colors text-zinc-300" 
                          title="Smazat"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-[11px] text-zinc-400 mb-1.5 leading-snug m-0">{loc.adresa}</p>
                    
                    {/* Hlavní atributy se jménem a klikatelným telefonem */}
                    <div className="flex flex-wrap items-center gap-1 mb-2">
                      {loc.kdy_chci && (
                        <span className="px-1.5 py-0.5 bg-purple-900/40 text-purple-300 text-[9px] uppercase font-bold rounded border border-purple-700/50">
                          Termín: {formatDate(loc.kdy_chci)}
                        </span>
                      )}
                      {loc.kontaktni_osoba && (
                        <span className="px-1.5 py-0.5 bg-blue-900/40 text-blue-300 text-[9px] uppercase font-bold rounded border border-blue-700/50">
                          {loc.kontaktni_osoba}
                        </span>
                      )}
                      {loc.kontaktni_telefon && (
                        <a
                          href={`tel:${loc.kontaktni_telefon}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-1.5 py-0.5 bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 hover:text-emerald-200 text-[9px] font-bold rounded border border-emerald-600/70 flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                          style={{ color: '#6ee7b7' }}
                          title={`Zavolat: ${loc.kontaktni_telefon}`}
                        >
                          <Phone className="w-2.5 h-2.5" style={{ color: '#6ee7b7' }} />
                          <span style={{ color: '#6ee7b7' }}>{loc.kontaktni_telefon}</span>
                        </a>
                      )}
                    </div>

                    {/* VÝRAZNÝ RÁMEČEK "CO CHCI?" */}
                    {loc.co_chci && (
                      <div className="my-2 p-2 bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-purple-950/70 border border-purple-500/60 rounded-lg shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                        <div className="text-[9px] uppercase tracking-wider font-extrabold text-purple-300 flex items-center gap-1 mb-0.5">
                          <span>🎯</span> Co chci:
                        </div>
                        <p className="text-[11px] font-medium text-white leading-snug m-0">
                          {loc.co_chci}
                        </p>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-zinc-800/60 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedPopupId(isExpanded ? null : loc.id)
                        }}
                        className="text-[10px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>{isExpanded ? 'Zobrazit méně' : 'Zobrazit více'}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
                      </button>
                    </div>

                    <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-2.5' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
                      <div className="overflow-hidden">
                        <div className="pt-2 border-t border-zinc-800/80 space-y-1.5 text-[11px] text-zinc-300 max-h-48 overflow-y-auto custom-scrollbar">
                          {loc.ic_rc && <div><span className="text-zinc-500 font-semibold">IČ/RČ:</span> {loc.ic_rc}</div>}
                          {loc.firma && <div><span className="text-zinc-500 font-semibold">Firma:</span> {loc.firma}</div>}
                          {loc.sleva && <div><span className="text-zinc-500 font-semibold">% Sleva:</span> {loc.sleva}%</div>}
                          {loc.hwb && <div><span className="text-zinc-500 font-semibold">HWB:</span> {loc.hwb}</div>}
                          {loc.co_jsem_delal && <div><span className="text-zinc-500 font-semibold">Co jsem dělal:</span> {loc.co_jsem_delal}</div>}
                          {loc.kdy_delal && <div><span className="text-zinc-500 font-semibold">Kdy dělal:</span> {formatDate(loc.kdy_delal)}</div>}
                          {loc.moje_poznamky && <div><span className="text-zinc-500 font-semibold">Poznámky:</span> {loc.moje_poznamky}</div>}
                          {loc.moje_fotka && (
                            <div className="mt-2">
                              <img src={loc.moje_fotka} alt="Fotka" className="w-full h-28 object-cover rounded-lg border border-zinc-800 shadow-md" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}