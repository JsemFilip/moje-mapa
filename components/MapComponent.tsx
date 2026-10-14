"use client"
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

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

const createColoredIcon = (color: string) => {
  const svgTemplate = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="36px" height="36px" stroke="white" stroke-width="2">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>`;
  
  return L.divIcon({
    className: "custom-colored-marker",
    html: svgTemplate,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -32]
  });
}

const defaultLocationIcon = createColoredIcon('#3b82f6')

function LocationMarker({ position }: { position: [number, number] | null }) {
  const map = useMap()
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, 13)
    }
  }, [position, map])

  return position === null ? null : (
    <Marker position={position} icon={defaultLocationIcon}>
      <Popup>Tvoje aktuální poloha</Popup>
    </Marker>
  )
}

// Ovladač pro plynulý přelet na vyhledanou adresu
function MapFlyController({ targetPosition }: { targetPosition?: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (targetPosition) {
      map.flyTo(targetPosition, 16, { duration: 1.4 })
    }
  }, [targetPosition, map])
  return null
}

export default function MapComponent({ locations = [], onSelectLocation, targetPosition }: { 
  locations?: LocationItem[], 
  onSelectLocation?: (loc: LocationItem) => void,
  targetPosition?: [number, number] | null
}) {
  const [position, setPosition] = useState<[number, number] | null>(null)

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
        () => setPosition([50.0755, 14.4378])
      )
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
        <LocationMarker position={position} />
        <MapFlyController targetPosition={targetPosition} />

        {locations.map((loc) => (
          <Marker 
            key={loc.id} 
            position={[loc.lat, loc.lng]} 
            icon={createColoredIcon(loc.barva || '#a855f7')}
          >
            <Popup>
              <div className="p-1 min-w-[180px] text-zinc-900">
                <h3 className="font-bold text-sm mb-1">{loc.nazev || 'Bez názvu'}</h3>
                <p className="text-xs text-zinc-600 mb-1">{loc.adresa}</p>
                {loc.kontaktni_osoba && (
                  <p className="text-xs text-zinc-500">Kontakt: {loc.kontaktni_osoba} ({loc.kontaktni_telefon})</p>
                )}
                {loc.moje_fotka && (
                  <img src={loc.moje_fotka} alt="Fotka" className="mt-2 rounded h-24 w-full object-cover" />
                )}
                {onSelectLocation && (
                  <button 
                    onClick={() => onSelectLocation(loc)} 
                    className="mt-2 w-full text-center bg-purple-600 text-white text-xs py-1.5 rounded-lg hover:bg-purple-700 font-medium cursor-pointer"
                  >
                    Detail / Upravit
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}