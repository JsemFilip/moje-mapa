"use client"
import { useState, useEffect, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import Auth from '@/components/Auth'
import dynamic from 'next/dynamic'
import type { LocationItem, MapBounds } from '@/components/MapComponent'
import { LogOut, List, MapPin, Plus, Menu, X, Trash2, Edit3, Search, Loader2, Camera, Filter, ArrowUpDown, Globe, Check, Eye, LocateFixed, ChevronDown, AlertTriangle, Phone } from 'lucide-react'

const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-zinc-950 flex items-center justify-center text-xs text-zinc-500">Načítání mapy...</div>
})

const PRESET_COLORS = [
  { label: 'Fialová', hex: '#a855f7' },
  { label: 'Červená', hex: '#ef4444' },
  { label: 'Zelená', hex: '#22c55e' },
  { label: 'Modrá', hex: '#3b82f6' },
  { label: 'Žlutá', hex: '#eab308' },
  { label: 'Oranžová', hex: '#f97316' },
  { label: 'Tyrkysová', hex: '#06b6d4' },
  { label: 'Růžová', hex: '#ec4899' },
  { label: 'Šedá', hex: '#71717a' }
]

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

type FormDataState = {
  barva: string
  ic_rc: string
  nazev: string
  adresa: string
  firma: string
  sleva: string
  hwb: string
  kontaktni_osoba: string
  kontaktni_telefon: string
  co_jsem_delal: string
  kdy_delal: string
  co_chci: string
  kdy_chci: string
  moje_poznamky: string
  moje_fotka: string
}

const emptyForm: FormDataState = {
  barva: 'Fialová',
  ic_rc: '',
  nazev: '',
  adresa: '',
  firma: '', 
  sleva: '',
  hwb: '',
  kontaktni_osoba: '',
  kontaktni_telefon: '',
  co_jsem_delal: '',
  kdy_delal: '',
  co_chci: '',
  kdy_chci: '',
  moje_poznamky: '',
  moje_fotka: ''
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`
  }
  return dateStr
}

const convertRawColorToNames = (raw?: string) => {
  if (!raw) return 'Fialová'
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
  const converted = parts.map(p => {
    const found = PRESET_COLORS.find(c => c.hex.toLowerCase() === p.toLowerCase() || c.label.toLowerCase() === p.toLowerCase())
    return found ? found.label : p
  })
  return converted.join(', ') || 'Fialová'
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [search, setSearch] = useState('')
  
  const [targetPosition, setTargetPosition] = useState<[number, number] | null>(null)
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null)
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
  const [centerTrigger, setCenterTrigger] = useState(0)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'date_wanted'>('newest')
  const [filterColor, setFilterColor] = useState<string>('all')
  const [filterVisibleOnly, setFilterVisibleOnly] = useState(false)
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormDataState>(emptyForm)

  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const modalTypingTimeout = useRef<NodeJS.Timeout | null>(null)

  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([])
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const searchTypingTimeout = useRef<NodeJS.Timeout | null>(null)
  
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const colorDropdownRef = useRef<HTMLDivElement>(null)
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth > 768) {
      setIsSidebarOpen(true)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session) fetchLocations()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchLocations()
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return

    const channel = supabase
      .channel('realtime-locations-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations' },
        () => {
          fetchLocations() 
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchSuggestions(false)
      }
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(e.target as Node)) {
        setIsColorDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchLocations = async () => {
    const { data, error } = await supabase.from('locations').select('*')
    if (!error && data) {
      setLocations(data as LocationItem[])
    }
  }

  const toggleColor = (label: string) => {
    let currentColors = formData.barva
      ? formData.barva.split(',').map(s => s.trim()).filter(Boolean)
      : []

    currentColors = currentColors.map(c => {
      const match = PRESET_COLORS.find(p => p.hex.toLowerCase() === c.toLowerCase() || p.label.toLowerCase() === c.toLowerCase())
      return match ? match.label : c
    })

    if (currentColors.some(c => c.toLowerCase() === label.toLowerCase())) {
      currentColors = currentColors.filter(c => c.toLowerCase() !== label.toLowerCase())
    } else {
      if (currentColors.length >= 4) {
        alert("Můžeš vybrat maximálně 4 barvy jako příznaky.")
        return
      }
      currentColors.push(label)
    }
    setFormData({ ...formData, barva: currentColors.join(', ') || 'Fialová' })
  }

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setShowSearchSuggestions(true)
    if (searchTypingTimeout.current) clearTimeout(searchTypingTimeout.current)
    if (val.trim().length < 3) {
      setSearchSuggestions([])
      return
    }
    searchTypingTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&addressdetails=1&limit=4`)
        const data = await res.json()
        setSearchSuggestions(data || [])
      } catch (e) {}
    }, 450)
  }

  const handleModalAddressChange = (val: string) => {
    setFormData({ ...formData, adresa: val })
    if (modalTypingTimeout.current) clearTimeout(modalTypingTimeout.current)
    if (val.length < 4) {
      setAddressSuggestions([])
      setShowSuggestions(false)
      return
    }
    modalTypingTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&addressdetails=1&limit=5`)
        const data = await res.json()
        setAddressSuggestions(data)
        setShowSuggestions(true)
      } catch (e) {}
    }, 500)
  }

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scaleSize = 800 / img.width
        canvas.width = 800
        canvas.height = img.height * scaleSize
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
        setFormData({ ...formData, moje_fotka: canvas.toDataURL('image/jpeg', 0.7) })
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const notifyGoogleSheet = async (action: 'INSERT' | 'UPDATE' | 'DELETE', payload: any, oldPayload?: any) => {
    const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL
    if (!scriptUrl) return 

    try {
      fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify({ type: action, record: payload, old_record: oldPayload }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      }).catch(() => {})
    } catch (e) {}
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return alert("Chyba zabezpečení: Nejsi přihlášený.")
    if (formData.kontaktni_telefon && !/^[0-9]{9}$/.test(formData.kontaktni_telefon)) {
      return alert("Telefonní číslo musí mít přesně 9 číslic.")
    }
    if (!formData.adresa) return alert("Prosím zadej adresu.")

    setSaving(true)
    let lat = 0, lng = 0
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.adresa)}`)
      const json = await res.json()
      if (json && json.length > 0) {
        lat = parseFloat(json[0].lat)
        lng = parseFloat(json[0].lon)
      } else {
        setSaving(false)
        return alert("Nenašli jsme GPS pro tuto adresu.")
      }
    } catch (e) {
      setSaving(false)
      return alert("Chyba při hledání GPS.")
    }

    const payload = { ...formData, lat, lng, user_id: session.user.id }

    if (editingId) {
      const oldLocation = locations.find(l => l.id === editingId)
      const { data, error } = await supabase.from('locations').update(payload).eq('id', editingId).select()
      if (error) { setSaving(false); return alert("Chyba: " + error.message) }
      if (data && data[0]) notifyGoogleSheet('UPDATE', data[0], oldLocation)
    } else {
      const { data, error } = await supabase.from('locations').insert([payload]).select()
      if (error) { setSaving(false); return alert("Chyba: " + error.message) }
      if (data && data[0]) notifyGoogleSheet('INSERT', data[0])
    }

    setSaving(false)
    setIsModalOpen(false)
    setEditingId(null)
    setFormData(emptyForm)
    await fetchLocations()
  }

  const confirmDelete = async () => {
    if (!locationToDelete) return
    const locToDelete = locations.find(l => l.id === locationToDelete)
    const { error } = await supabase.from('locations').delete().eq('id', locationToDelete)
    
    if (error) alert("Chyba při mazání: " + error.message)
    else {
      if (locToDelete) notifyGoogleSheet('DELETE', null, locToDelete)
      await fetchLocations()
    }
    setLocationToDelete(null)
  }

  const handleDeleteRequest = (id: string) => {
    setLocationToDelete(id)
  }

  const handleEdit = (loc: LocationItem) => {
    setEditingId(loc.id)
    setFormData({
      barva: convertRawColorToNames(loc.barva),
      ic_rc: loc.ic_rc || '',
      nazev: loc.nazev || '',
      adresa: loc.adresa || '',
      firma: loc.firma || '',
      sleva: loc.sleva || '',
      hwb: loc.hwb || '',
      kontaktni_osoba: loc.kontaktni_osoba || '',
      kontaktni_telefon: loc.kontaktni_telefon || '',
      co_jsem_delal: loc.co_jsem_delal || '',
      kdy_delal: loc.kdy_delal || '',
      co_chci: loc.co_chci || '',
      kdy_chci: loc.kdy_chci || '',
      moje_poznamky: loc.moje_poznamky || '',
      moje_fotka: loc.moje_fotka || ''
    })
    setIsModalOpen(true)
  }

  const handleSelectLocationFromList = (loc: LocationItem) => {
    setTargetPosition([loc.lat, loc.lng])
    setActiveLocationId(loc.id)
    
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false)
    }
  }

  const matchingSaved = search.trim().length >= 1
    ? locations.filter(l => 
        (l.nazev?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (l.adresa?.toLowerCase() || '').includes(search.toLowerCase())
      ).slice(0, 5)
    : []

  let processedLocations = [...locations]

  if (search) {
    processedLocations = processedLocations.filter(l => 
      (l.nazev?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (l.adresa?.toLowerCase() || '').includes(search.toLowerCase())
    )
  }

  if (filterColor !== 'all') {
    processedLocations = processedLocations.filter(l => {
      if (!l.barva) return false
      const matchedPreset = PRESET_COLORS.find(p => p.label.toLowerCase() === filterColor.toLowerCase())
      const targetHex = matchedPreset ? matchedPreset.hex.toLowerCase() : ''
      const lBarvaLower = l.barva.toLowerCase()
      return lBarvaLower.includes(filterColor.toLowerCase()) || (targetHex && lBarvaLower.includes(targetHex))
    })
  }

  if (filterVisibleOnly && mapBounds) {
    processedLocations = processedLocations.filter(l => 
      l.lat >= mapBounds.south && 
      l.lat <= mapBounds.north && 
      l.lng >= mapBounds.west && 
      l.lng <= mapBounds.east
    )
  }

  processedLocations.sort((a, b) => {
    if (sortBy === 'name') return (a.nazev || '').localeCompare(b.nazev || '')
    if (sortBy === 'date_wanted') return (a.kdy_chci || '').localeCompare(b.kdy_chci || '')
    if (sortBy === 'oldest') return a.id.localeCompare(b.id)
    return b.id.localeCompare(a.id)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] w-full bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!session) return <Auth />

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden bg-zinc-950 text-zinc-100 font-sans overscroll-none touch-none">
      
      <div className="absolute inset-0 z-0 touch-auto">
        <MapComponent 
          locations={locations}
          onSelectLocation={handleEdit} 
          onDeleteLocation={handleDeleteRequest}
          targetPosition={targetPosition} 
          onBoundsChange={setMapBounds} 
          centerTrigger={centerTrigger}
          activeLocationId={activeLocationId}
        />
      </div>

      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2.5 bg-zinc-900/90 backdrop-blur-md text-zinc-200 rounded-xl border border-zinc-800 shadow-xl cursor-pointer hover:bg-zinc-800 hover:text-white transition-all active:scale-95"
          title="Otevřít/zavřít menu"
        >
          {isSidebarOpen ? <X className="w-5 h-5 text-purple-400" /> : <Menu className="w-5 h-5 text-purple-400" />}
        </button>

        <button 
          onClick={() => setCenterTrigger(prev => prev + 1)}
          className="p-2.5 bg-zinc-900/90 backdrop-blur-md text-zinc-200 rounded-xl border border-zinc-800 shadow-xl cursor-pointer hover:bg-zinc-800 hover:text-white transition-all active:scale-95"
          title="Zpět na moji polohu"
        >
          <LocateFixed className="w-5 h-5 text-blue-400" />
        </button>
      </div>

      <div 
        onClick={() => setIsSidebarOpen(false)}
        className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[15] transition-opacity duration-300"
        style={{
          opacity: isSidebarOpen ? 1 : 0,
          pointerEvents: isSidebarOpen ? 'auto' : 'none'
        }}
      />

      {/* KLÍČOVÁ ÚPRAVA: Přidáno podmiňování `shadow-none` když je panel zavřený */}
      <div 
        className={`
          sidebar-panel-container
          ${isSidebarOpen ? 'sidebar-open shadow-[0_20px_50px_rgba(0,0,0,0.9)]' : 'sidebar-closed shadow-none'}
          absolute top-0 left-0 bottom-0 sm:top-4 sm:bottom-4 sm:left-4 z-20 
          w-full sm:w-[350px] 
          bg-zinc-900/95 backdrop-blur-xl 
          rounded-none sm:rounded-2xl overflow-hidden flex flex-col 
          border-0 sm:border border-zinc-800/80 touch-auto
        `}
      >
        <div className="pt-6 sm:pt-4 px-4 pb-4 border-b border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between shrink-0 sm:rounded-t-2xl pl-16">
          <div>
            <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <MapPin className="text-purple-400 w-4 h-4" />
              Moje adresy ({processedLocations.length})
            </h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-zinc-800/50 space-y-2 shrink-0">
          <div ref={searchContainerRef} className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Hledat název nebo adresu..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowSearchSuggestions(true)}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg pl-8 pr-7 py-2.5 text-[16px] sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 appearance-none"
            />
            {search && (
              <button onClick={() => { setSearch(''); setSearchSuggestions([]); }} className="absolute right-2.5 top-3 text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {showSearchSuggestions && search.trim().length >= 1 && (
              <div className="absolute top-[100%] left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                {matchingSaved.length > 0 && (
                  <div className="p-1.5 border-b border-zinc-800">
                    <p className="text-[10px] uppercase font-bold text-zinc-500 px-2 py-1 tracking-wider">Moje uložená místa</p>
                    {matchingSaved.map((loc) => {
                      const locColors = parseColorsToHexArray(loc.barva)
                      return (
                        <div key={loc.id} onClick={() => { setSearch(loc.nazev || loc.adresa || ''); handleSelectLocationFromList(loc); setShowSearchSuggestions(false) }} className="p-2 hover:bg-zinc-800/90 rounded-lg cursor-pointer transition-colors flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-full shrink-0 border border-zinc-700" style={{ background: locColors[0] || '#a855f7' }} />
                          <div className="overflow-hidden">
                            <p className="font-semibold text-zinc-200 truncate">{loc.nazev || 'Bez názvu'}</p>
                            <p className="text-[10px] text-zinc-400 truncate">{loc.adresa}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {searchSuggestions.length > 0 && (
                  <div className="p-1.5">
                    <p className="text-[10px] uppercase font-bold text-purple-400 px-2 py-1 tracking-wider flex items-center gap-1"><Globe className="w-3 h-3" /> Adresy z mapy</p>
                    {searchSuggestions.map((sug, i) => (
                      <div key={i} onClick={() => { setSearch(sug.display_name); setTargetPosition([parseFloat(sug.lat), parseFloat(sug.lon)]); setActiveLocationId(null); setShowSearchSuggestions(false); if(typeof window !== "undefined" && window.innerWidth < 768) setIsSidebarOpen(false); }} className="p-2 hover:bg-zinc-800/90 rounded-lg cursor-pointer transition-colors text-xs text-zinc-300 border-b border-zinc-800/50 last:border-0">
                        <p className="text-[11px] leading-snug line-clamp-2">{sug.display_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <ArrowUpDown className="w-3.5 h-3.5 absolute left-2 top-3 text-zinc-500 pointer-events-none" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg pl-7 pr-2 py-2.5 text-[10px] uppercase font-semibold tracking-wider text-zinc-300 appearance-none focus:outline-none focus:border-purple-500 cursor-pointer hover:border-zinc-700 transition-colors">
                <option value="newest">Od nejnovějších</option>
                <option value="oldest">Od nejstarších</option>
                <option value="name">Podle názvu A-Z</option>
                <option value="date_wanted">Podle "Kdy chci"</option>
              </select>
            </div>

            <div className="relative flex-1" ref={colorDropdownRef}>
              <div 
                onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                className="w-full h-full bg-zinc-950/80 border border-zinc-800 rounded-lg pl-7 pr-2 py-2.5 text-[10px] uppercase font-semibold tracking-wider text-zinc-300 cursor-pointer hover:border-zinc-700 transition-colors flex items-center"
              >
                <Filter className="w-3.5 h-3.5 absolute left-2 top-3 text-zinc-500" />
                <div className="flex items-center gap-1.5 truncate">
                  {filterColor === 'all' ? (
                    <span>Všechny barvy</span>
                  ) : (
                    <>
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PRESET_COLORS.find(c => c.label === filterColor)?.hex }} />
                      <span className="truncate">{filterColor}</span>
                    </>
                  )}
                </div>
              </div>

              {isColorDropdownOpen && (
                <div className="absolute top-[100%] left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div 
                    onClick={() => { setFilterColor('all'); setIsColorDropdownOpen(false); }}
                    className="p-2.5 hover:bg-zinc-800/90 cursor-pointer text-[10px] uppercase font-semibold text-zinc-300 border-b border-zinc-800/50"
                  >
                    Všechny barvy
                  </div>
                  {PRESET_COLORS.map(c => (
                    <div 
                      key={c.label}
                      onClick={() => { setFilterColor(c.label); setIsColorDropdownOpen(false); }}
                      className="p-2.5 hover:bg-zinc-800/90 cursor-pointer text-[10px] uppercase font-semibold text-zinc-300 border-b border-zinc-800/50 last:border-0 flex items-center gap-2"
                    >
                      <div className="w-3 h-3 rounded-full border border-zinc-700 shrink-0" style={{ backgroundColor: c.hex }} />
                      <span className="truncate">{c.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setFilterVisibleOnly(!filterVisibleOnly)}
            className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[10px] uppercase font-bold tracking-wide transition-all border cursor-pointer ${
              filterVisibleOnly 
                ? 'bg-purple-900/40 text-purple-300 border-purple-700/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]' 
                : 'bg-zinc-950/80 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {filterVisibleOnly ? 'Zobrazují se jen místa na mapě' : 'Filtrovat jen viditelné na mapě'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar touch-pan-y overscroll-contain">
          {processedLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
              <List className="w-8 h-8 text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-400">Žádné záznamy nenalezeny</p>
            </div>
          ) : (
            processedLocations.map((loc) => {
              const locColors = parseColorsToHexArray(loc.barva)
              const isExpanded = expandedId === loc.id

              return (
                <div 
                  key={loc.id} 
                  onClick={() => handleSelectLocationFromList(loc)}
                  className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-all flex gap-3 relative overflow-hidden group cursor-pointer"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 opacity-90 flex flex-col">
                    {locColors.map((c, i) => (
                      <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>

                  <div className="flex-1 pl-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-xs text-zinc-100">{loc.nazev || 'Bez názvu'}</h3>
                      <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(loc); }} className="p-1.5 hover:text-purple-400 bg-zinc-800 rounded cursor-pointer transition-colors" title="Upravit"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteRequest(loc.id); }} className="p-1.5 hover:text-red-400 bg-zinc-800 rounded cursor-pointer transition-colors" title="Smazat"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-400 mb-1.5 leading-snug">{loc.adresa}</p>
                    
                    <div className="flex flex-wrap items-center gap-1 mb-2">
                      {loc.kdy_chci && (
                        <span className="px-1.5 py-0.5 bg-purple-900/40 text-purple-300 text-[9px] uppercase font-bold rounded border border-purple-700/50">Termín: {formatDate(loc.kdy_chci)}</span>
                      )}
                      {loc.kontaktni_osoba && (
                        <span className="px-1.5 py-0.5 bg-blue-900/40 text-blue-300 text-[9px] uppercase font-bold rounded border border-blue-700/50">{loc.kontaktni_osoba}</span>
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

                    {loc.co_chci && (
                      <div className="my-2 p-2 bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-purple-950/70 border border-purple-500/60 rounded-lg shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                        <div className="text-[9px] uppercase tracking-wider font-extrabold text-purple-300 flex items-center gap-1 mb-0.5">
                          <span>🎯</span> Co chci:
                        </div>
                        <p className="text-[11px] font-medium text-white leading-snug">
                          {loc.co_chci}
                        </p>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-zinc-800/60 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedId(isExpanded ? null : loc.id)
                        }}
                        className="text-[10px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>{isExpanded ? 'Zobrazit méně' : 'Zobrazit více'}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
                      </button>
                    </div>

                    <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-2.5' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
                      <div className="overflow-hidden">
                        <div className="pt-2 border-t border-zinc-800/80 space-y-1.5 text-[11px] text-zinc-300">
                          {loc.ic_rc && <div><span className="text-zinc-500 font-semibold">IČ/RČ:</span> {loc.ic_rc}</div>}
                          {loc.firma && <div><span className="text-zinc-500 font-semibold">Firma:</span> {loc.firma}</div>}
                          {loc.sleva && <div><span className="text-zinc-500 font-semibold">% Sleva:</span> {loc.sleva}%</div>}
                          {loc.hwb && <div><span className="text-zinc-500 font-semibold">HWB:</span> {loc.hwb}</div>}
                          {(loc.kontaktni_osoba || loc.kontaktni_telefon) && (
                            <div className="flex items-center gap-1">
                              <span className="text-zinc-500 font-semibold">Kontakt:</span>
                              <span>{loc.kontaktni_osoba}</span>
                              {loc.kontaktni_telefon && (
                                <a 
                                  href={`tel:${loc.kontaktni_telefon}`} 
                                  onClick={(e) => e.stopPropagation()} 
                                  className="text-emerald-400 hover:text-emerald-300 hover:underline font-medium inline-flex items-center gap-1 ml-1 cursor-pointer"
                                  style={{ color: '#34d399' }}
                                >
                                  <Phone className="w-2.5 h-2.5" style={{ color: '#34d399' }} />
                                  <span style={{ color: '#34d399' }}>({loc.kontaktni_telefon})</span>
                                </a>
                              )}
                            </div>
                          )}
                          {loc.co_jsem_delal && <div><span className="text-zinc-500 font-semibold">Co jsem dělal:</span> {loc.co_jsem_delal}</div>}
                          {loc.kdy_delal && <div><span className="text-zinc-500 font-semibold">Kdy dělal:</span> {formatDate(loc.kdy_delal)}</div>}
                          {loc.moje_poznamky && <div><span className="text-zinc-500 font-semibold">Poznámky:</span> {loc.moje_poznamky}</div>}
                          {loc.moje_fotka && (
                            <div className="mt-2">
                              <img src={loc.moje_fotka} alt="Fotka" className="w-full h-32 object-cover rounded-lg border border-zinc-800" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/50 shrink-0 sm:rounded-b-2xl">
          <button 
            onClick={() => { setEditingId(null); setFormData(emptyForm); setIsModalOpen(true) }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-3 sm:py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold rounded-lg transition-all shadow-lg shadow-purple-600/20 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Přidat nové místo
          </button>
        </div>
      </div>

      <button 
        onClick={() => supabase.auth.signOut()}
        className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-2 sm:py-1.5 bg-zinc-900/90 hover:bg-red-950/80 text-zinc-300 hover:text-red-300 text-xs font-semibold rounded-lg border border-zinc-800 hover:border-red-700/60 shadow-xl hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] active:scale-95 transition-all cursor-pointer group"
      >
        <LogOut className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
        <span className="hidden sm:inline">Odhlásit</span>
      </button>

      {locationToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-950/50 rounded-full border border-red-900/50">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-white text-center mb-2">Opravdu smazat?</h2>
            <p className="text-xs text-zinc-400 text-center mb-6 leading-relaxed">
              Tato akce je nevratná. Záznam bude odstraněn z mapy i z databáze.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setLocationToDelete(null)} className="flex-1 py-3 sm:py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer">Zrušit</button>
              <button onClick={confirmDelete} className="flex-1 py-3 sm:py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all cursor-pointer active:scale-95">Ano, smazat</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 overflow-hidden touch-none">
          <div className="bg-zinc-900 sm:border border-zinc-800 sm:rounded-2xl w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] max-w-2xl flex flex-col shadow-2xl overflow-hidden">
            
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/50 shrink-0">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="text-purple-400 w-5 h-5" />
                {editingId ? 'Upravit záznam' : 'Nové místo'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs custom-scrollbar touch-pan-y overscroll-contain pb-24 sm:pb-5">
              
              <div className="sm:col-span-2">
                <label className="text-zinc-400 mb-2 block font-semibold text-[10px] uppercase tracking-wider">Příznaky (Max 4 barvy)</label>
                <div className="flex flex-wrap gap-2.5">
                  {PRESET_COLORS.map(color => {
                    const selectedColors = formData.barva
                      ? formData.barva.split(',').map(s => s.trim().toLowerCase())
                      : []
                    const isSelected = selectedColors.includes(color.label.toLowerCase()) || selectedColors.includes(color.hex.toLowerCase())

                    return (
                      <button
                        key={color.label}
                        type="button"
                        onClick={() => toggleColor(color.label)}
                        className={`w-9 h-9 sm:w-8 sm:h-8 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${isSelected ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: color.hex }}
                        title={color.label}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="sm:col-span-2 relative mt-2">
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Adresa (Vyhledávání) *</label>
                <input required type="text" placeholder="Začni psát adresu..." value={formData.adresa} onChange={(e) => handleModalAddressChange(e.target.value)} onFocus={() => formData.adresa.length > 3 && setShowSuggestions(true)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-[16px] sm:text-xs text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all appearance-none" />
                
                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute top-[100%] left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    {addressSuggestions.map((sug, i) => (
                      <div key={i} className="p-3 hover:bg-zinc-700 cursor-pointer border-b border-zinc-700/50 last:border-0 text-zinc-200 transition-colors text-[16px] sm:text-xs" onClick={() => { setFormData({ ...formData, adresa: sug.display_name }); setShowSuggestions(false); }}>
                        {sug.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Název objektu / Místa</label>
                <input type="text" value={formData.nazev} onChange={e => setFormData({...formData, nazev: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[16px] sm:text-xs text-white appearance-none" />
              </div>

              <div>
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">IČ / RČ</label>
                <input type="text" value={formData.ic_rc} onChange={e => setFormData({...formData, ic_rc: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[16px] sm:text-xs text-white appearance-none" />
              </div>

              <div>
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Firma?</label>
                <select value={formData.firma} onChange={e => setFormData({...formData, firma: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[16px] sm:text-xs text-white appearance-none cursor-pointer hover:border-zinc-700 transition-colors">
                  <option value="">Nevybráno</option>
                  <option value="Ano">Ano</option>
                  <option value="Ne">Ne</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">% Sleva? (0-40)</label>
                <input type="number" min="0" max="40" value={formData.sleva} onChange={e => setFormData({...formData, sleva: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[16px] sm:text-xs text-white appearance-none" />
              </div>

              <div>
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">HWB?</label>
                <input type="number" value={formData.hwb} onChange={e => setFormData({...formData, hwb: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[16px] sm:text-xs text-white appearance-none" />
              </div>

              <div>
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Kontaktní osoba</label>
                <input type="text" value={formData.kontaktni_osoba} onChange={e => setFormData({...formData, kontaktni_osoba: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[16px] sm:text-xs text-white appearance-none" />
              </div>

              <div className="sm:col-span-2">
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Kontaktní telefon (9 číslic)</label>
                <input type="tel" maxLength={9} pattern="[0-9]{9}" placeholder="Např. 777123456" value={formData.kontaktni_telefon} onChange={e => setFormData({...formData, kontaktni_telefon: e.target.value})} className="w-full sm:w-1/2 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[16px] sm:text-xs text-white appearance-none" />
              </div>

              <div className="sm:col-span-2">
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Co jsem dělal?</label>
                <textarea rows={3} value={formData.co_jsem_delal} onChange={e => setFormData({...formData, co_jsem_delal: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[16px] sm:text-xs text-white leading-relaxed appearance-none" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-zinc-400 font-semibold text-[10px] uppercase tracking-wider">Kdy dělal?</label>
                  <button type="button" onClick={() => { const now = new Date(); const y = now.getFullYear(); const m = String(now.getMonth() + 1).padStart(2, '0'); const d = String(now.getDate()).padStart(2, '0'); setFormData({ ...formData, kdy_delal: `${y}-${m}-${d}` }) }} className="text-[10px] px-2 py-0.5 bg-purple-900/40 text-purple-300 hover:bg-purple-800/60 rounded border border-purple-700/50 cursor-pointer font-bold transition-colors">Dnes</button>
                </div>
                <input type="date" value={formData.kdy_delal} onChange={e => setFormData({...formData, kdy_delal: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[16px] sm:text-xs text-white [color-scheme:dark] cursor-pointer appearance-none" />
              </div>

              <div className="sm:col-span-2">
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Co chci?</label>
                <textarea rows={3} value={formData.co_chci} onChange={e => setFormData({...formData, co_chci: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[16px] sm:text-xs text-white leading-relaxed appearance-none" />
              </div>

              <div>
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Kdy chci?</label>
                <input type="date" value={formData.kdy_chci} onChange={e => setFormData({...formData, kdy_chci: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[16px] sm:text-xs text-white [color-scheme:dark] cursor-pointer appearance-none" />
              </div>

              <div className="sm:col-span-2">
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Moje poznámky</label>
                <textarea rows={2} value={formData.moje_poznamky} onChange={e => setFormData({...formData, moje_poznamky: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[16px] sm:text-xs text-white appearance-none" />
              </div>

              <div className="sm:col-span-2 mt-2 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50 flex flex-col sm:flex-row items-center gap-4 shrink-0">
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" id="camera-upload" />
                <label htmlFor="camera-upload" className="cursor-pointer flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors w-full sm:w-auto font-medium">
                  <Camera className="w-4 h-4 text-purple-400" />
                  Vyfotit / Nahrát fotku
                </label>
                {formData.moje_fotka && (
                  <div className="relative">
                    <img src={formData.moje_fotka} alt="Náhled" className="h-16 w-16 object-cover rounded-lg border border-purple-500/50 shadow-lg" />
                    <button type="button" onClick={() => setFormData({...formData, moje_fotka: ''})} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow cursor-pointer transition-colors"><X className="w-3 h-3" /></button>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6 pt-5 border-t border-zinc-800 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 sm:py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium cursor-pointer transition-colors w-full sm:w-auto text-[16px] sm:text-xs">
                  Zrušit
                </button>
                <button type="submit" disabled={saving} className="px-5 py-3 sm:py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto text-[16px] sm:text-xs">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Uložit změny' : 'Přidat na mapu'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}