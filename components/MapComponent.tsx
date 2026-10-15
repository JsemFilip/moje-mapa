"use client"
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, useMapEvents } from 'react-leaflet'
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

export type MapBounds = {
  south: number
  west: number
  north: number
  east: number
}

const createPizzaIcon = (colorString?: string) => {
  const colors = colorString ? colorString.split(',') : ['#a855f7'];
  let bg = colors[0];

  if (colors.length === 2) {
    bg = `conic-gradient(${colors[0]} 0% 50%, ${colors[1]} 50% 100%)`;
  } else if (colors.length === 3) {
    bg = `conic-gradient(${colors[0]} 0% 33.33%, ${colors[1]} 33.33% 66.66%, ${colors[2]} 66.66% 100%)`;
  } else if (colors.length >= 4) {
    bg = `conic-gradient(${colors[0]} 0% 25%, ${colors[1]} 25% 50%, ${colors[2]} 50% 75%, ${colors[3]} 75% 100%)`;
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
  `;
  
  return L.divIcon({
    className: "custom-pizza-marker bg-transparent border-0",
    html: html,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14]
  });
}

// Opravená ikona pro moji polohu (bez "interactive" vlastnosti v DivIcon)
// Přidáno "pointer-events-none" aby ignorovala klikání myší
const userLocationIcon = L.divIcon({
  className: "user-location-marker bg-transparent border-0 pointer-events-none",
  html: `
    <div class="relative flex items-center justify-center w-8 h-8 pointer-events-none">
      <div class="absolute inline-flex w-full h-full rounded-full bg-blue-500 opacity-40 animate-ping"></div>
      <div class="relative inline-flex rounded-full w-4 h-4 bg-blue-600 border-2 border-white shadow-lg"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

function MapController({ 
  position, 
  targetPosition,
  centerTrigger 
}: { 
  position: [number, number] | null, 
  targetPosition?: [number, number] | null,
  centerTrigger: number
}) {
  const map = useMap()
  
  useEffect(() => {
    if (targetPosition) {
      map.flyTo(targetPosition, 16, { duration: 1.4 })
    }
  }, [targetPosition, map])

  useEffect(() => {
    if (position && centerTrigger > 0) {
      map.flyTo(position, 15, { duration: 1 })
    }
  }, [centerTrigger, position, map])

  useEffect(() => {
    if (position && centerTrigger === 0) {
      map.flyTo(position, 13)
    }
  }, [position, map])

  return position === null ? null : (
    // Zde nastavíme interactive={false} na samotné komponentě Marker z React-Leaflet
    <Marker position={position} icon={userLocationIcon} interactive={false} />
  )
}

function BoundsHandler({ onBoundsChange }: { onBoundsChange?: (b: MapBounds) => void }) {
  const map = useMapEvents({
    moveend: () => updateBounds(),
    zoomend: () => updateBounds(),
  })

  const updateBounds = () => {
    if (!onBoundsChange) return;
    const b = map.getBounds();
    onBoundsChange({
      south: b.getSouth(),
      west: b.getWest(),
      north: b.getNorth(),
      east: b.getEast(),
    });
  }

  useEffect(() => {
    updateBounds();
  }, [map])

  return null;
}

export default function MapComponent({ 
  locations = [], 
  onSelectLocation, 
  targetPosition, 
  onBoundsChange,
  centerTrigger = 0 
}: { 
  locations?: LocationItem[], 
  onSelectLocation?: (loc: LocationItem) => void,
  targetPosition?: [number, number] | null,
  onBoundsChange?: (bounds: MapBounds) => void,
  centerTrigger?: number
}) {
  const [position, setPosition] = useState<[number, number] | null>(null)

  useEffect(() => {
    if ("geolocation" in navigator) {
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
        <MapController position={position} targetPosition={targetPosition} centerTrigger={centerTrigger} />
        <BoundsHandler onBoundsChange={onBoundsChange} />

        {locations.map((loc) => (
          <Marker 
            key={loc.id} 
            position={[loc.lat, loc.lng]} 
            icon={createPizzaIcon(loc.barva)}
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