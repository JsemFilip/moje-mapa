"use client"
import { useState, useEffect, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import Auth from '@/components/Auth'
import dynamic from 'next/dynamic'
import { LocationItem } from '@/components/MapComponent'
import { LogOut, List, MapPin, Plus, Menu, X, Trash2, Edit3, Search, Loader2, Camera, Filter, ArrowUpDown } from 'lucide-react'

const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-zinc-950 flex items-center justify-center text-xs text-zinc-500">Načítání mapy...</div>
})

// Předdefinované barvy pro špendlíky
const PRESET_COLORS = [
  { label: 'Fialová (Výchozí)', hex: '#a855f7' },
  { label: 'Červená (Urgentní)', hex: '#ef4444' },
  { label: 'Zelená (Hotovo)', hex: '#22c55e' },
  { label: 'Modrá (Plán)', hex: '#3b82f6' },
  { label: 'Žlutá (Čeká se)', hex: '#eab308' }
]

const emptyForm: Omit<LocationItem, 'id' | 'lat' | 'lng'> = {
  barva: '#a855f7',
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

export default function Home() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [search, setSearch] = useState('')
  
  // Stavy pro řazení a filtraci
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'date_wanted'>('newest')
  const [filterColor, setFilterColor] = useState<string>('all')
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyForm)

  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const typingTimeout = useRef<NodeJS.Timeout | null>(null)

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

  const fetchLocations = async () => {
    const { data, error } = await supabase.from('locations').select('*')
    if (!error && data) {
      setLocations(data as LocationItem[])
    }
  }

  const handleAddressChange = (val: string) => {
    setFormData({ ...formData, adresa: val })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    
    if (val.length < 4) {
      setAddressSuggestions([])
      setShowSuggestions(false)
      return
    }
    typingTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&addressdetails=1&limit=5`)
        const data = await res.json()
        setAddressSuggestions(data)
        setShowSuggestions(true)
      } catch (e) { console.error(e) }
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
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

    const payload = { ...formData, lat, lng }

    if (editingId) {
      await supabase.from('locations').update(payload).eq('id', editingId)
    } else {
      await supabase.from('locations').insert([payload])
    }

    setSaving(false)
    setIsModalOpen(false)
    setEditingId(null)
    setFormData(emptyForm)
    fetchLocations()
  }

  const handleDelete = async (id: string) => {
    if (confirm("Opravdu chceš toto místo smazat?")) {
      await supabase.from('locations').delete().eq('id', id)
      fetchLocations()
    }
  }

  const handleEdit = (loc: LocationItem) => {
    setEditingId(loc.id)
    setFormData({
      barva: loc.barva || '#a855f7',
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

  // --- LOGIKA PRO ŘAZENÍ A FILTROVÁNÍ ---
  let processedLocations = [...locations]

  // 1. Filtrace textem (Hledání)
  if (search) {
    processedLocations = processedLocations.filter(l => 
      (l.nazev?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (l.adresa?.toLowerCase() || '').includes(search.toLowerCase())
    )
  }

  // 2. Filtrace podle barvy
  if (filterColor !== 'all') {
    processedLocations = processedLocations.filter(l => l.barva === filterColor)
  }

  // 3. Řazení
  processedLocations.sort((a, b) => {
    if (sortBy === 'name') {
      return (a.nazev || '').localeCompare(b.nazev || '')
    }
    if (sortBy === 'date_wanted') {
      return (a.kdy_chci || '').localeCompare(b.kdy_chci || '')
    }
    if (sortBy === 'oldest') {
      // Předpokládáme, že ID v poli locations přichází seřazené z databáze (dle času přidání)
      // Pro bezpečnější řazení by locations mělo mít atribut created_at
      return a.id.localeCompare(b.id) 
    }
    // Default: 'newest'
    return b.id.localeCompare(a.id)
  })


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!session) return <Auth />

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      
      <div className="absolute inset-0 z-0">
        {/* Do mapy posíláme jen VYFILTROVANÁ data, aby na mapě svítily jen ty špendlíky, které hledáme */}
        <MapComponent locations={processedLocations} onSelectLocation={handleEdit} />
      </div>

      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden absolute top-4 left-4 z-30 p-2.5 bg-zinc-900/90 backdrop-blur-md text-zinc-200 rounded-xl border border-zinc-800 shadow-xl"
      >
        {isSidebarOpen ? <X className="w-4 h-4 text-purple-400" /> : <Menu className="w-4 h-4 text-purple-400" />}
      </button>

      <div className={`
        absolute top-4 bottom-4 left-4 z-20 
        w-[calc(100vw-2rem)] sm:w-[350px] 
        bg-zinc-900/95 backdrop-blur-xl 
        shadow-[0_20px_50px_rgba(0,0,0,0.9)] 
        rounded-2xl flex flex-col 
        border border-zinc-800/80 
        transition-all duration-300
        ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-[calc(100%+2rem)] md:translate-x-0 opacity-0 md:opacity-100'}
      `}>
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <MapPin className="text-purple-400 w-4 h-4" />
              Moje adresy ({processedLocations.length})
            </h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-zinc-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nástroje: Hledání, Filtr Barvy, Řazení */}
        <div className="p-3 border-b border-zinc-800/50 space-y-2 shrink-0">
          
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Hledat název nebo adresu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <ArrowUpDown className="w-3.5 h-3.5 absolute left-2 top-2.5 text-zinc-500 pointer-events-none" />
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg pl-7 pr-2 py-2 text-[10px] uppercase font-semibold tracking-wider text-zinc-300 appearance-none focus:outline-none focus:border-purple-500"
              >
                <option value="newest">Od nejnovějších</option>
                <option value="oldest">Od nejstarších</option>
                <option value="name">Podle názvu A-Z</option>
                <option value="date_wanted">Podle termínu "Kdy chci"</option>
              </select>
            </div>

            <div className="relative flex-1">
              <Filter className="w-3.5 h-3.5 absolute left-2 top-2.5 text-zinc-500 pointer-events-none" />
              <select 
                value={filterColor} 
                onChange={(e) => setFilterColor(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg pl-7 pr-2 py-2 text-[10px] uppercase font-semibold tracking-wider text-zinc-300 appearance-none focus:outline-none focus:border-purple-500"
              >
                <option value="all">Všechny barvy</option>
                {PRESET_COLORS.map(c => (
                  <option key={c.hex} value={c.hex}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {processedLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
              <List className="w-8 h-8 text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-400">Žádné záznamy nenalezeny</p>
            </div>
          ) : (
            processedLocations.map((loc) => (
              <div key={loc.id} className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-all flex gap-3 relative overflow-hidden group">
                
                {/* Obarvený indikátor vlevo */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 opacity-80" style={{ backgroundColor: loc.barva || '#a855f7' }}></div>

                <div className="flex-1 pl-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-xs text-zinc-100">{loc.nazev || 'Bez názvu'}</h3>
                    <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(loc)} className="p-1 hover:text-purple-400 bg-zinc-800 rounded"><Edit3 className="w-3 h-3" /></button>
                      <button onClick={() => handleDelete(loc.id)} className="p-1 hover:text-red-400 bg-zinc-800 rounded"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400 mb-1.5 leading-snug">{loc.adresa}</p>
                  
                  {/* Štítky s informacemi */}
                  <div className="flex flex-wrap gap-1">
                    {loc.kdy_chci && (
                      <span className="px-1.5 py-0.5 bg-purple-900/40 text-purple-300 text-[9px] uppercase font-bold rounded border border-purple-700/50">
                        Termín: {loc.kdy_chci}
                      </span>
                    )}
                    {loc.kontaktni_osoba && (
                      <span className="px-1.5 py-0.5 bg-blue-900/40 text-blue-300 text-[9px] uppercase font-bold rounded border border-blue-700/50">
                        {loc.kontaktni_osoba}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/50 shrink-0">
          <button 
            onClick={() => { setEditingId(null); setFormData(emptyForm); setIsModalOpen(true) }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Přidat nové místo
          </button>
        </div>
      </div>

      <button 
        onClick={() => supabase.auth.signOut()}
        className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/90 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-800 shadow-xl"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Odhlásit</span>
      </button>

      {/* MODAL FORMULÁŘ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-5 border-b border-zinc-800 bg-zinc-950/50 shrink-0">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="text-purple-400 w-5 h-5" />
                {editingId ? 'Upravit záznam' : 'Nové místo'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white p-1 bg-zinc-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs custom-scrollbar">
              
              {/* Nové pole: Výběr Barvy */}
              <div className="sm:col-span-2">
                <label className="text-zinc-400 mb-2 block font-semibold text-[10px] uppercase tracking-wider">Barva špendlíku</label>
                <div className="flex gap-3">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setFormData({...formData, barva: color.hex})}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formData.barva === color.hex ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: color.hex }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              {/* Adresa */}
              <div className="sm:col-span-2 relative mt-2">
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Adresa (Vyhledávání) *</label>
                <input required type="text" placeholder="Začni psát adresu..." value={formData.adresa} onChange={(e) => handleAddressChange(e.target.value)} onFocus={() => formData.adresa.length > 3 && setShowSuggestions(true)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all" />
                
                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute top-[100%] left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    {addressSuggestions.map((sug, i) => (
                      <div 
                        key={i} 
                        className="p-3 hover:bg-zinc-700 cursor-pointer border-b border-zinc-700/50 last:border-0 text-zinc-200"
                        onClick={() => {
                          setFormData({ ...formData, adresa: sug.display_name })
                          setShowSuggestions(false)
                        }}
                      >
                        {sug.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Název objektu / Místa</label>
                <input type="text" value={formData.nazev} onChange={e => setFormData({...formData, nazev: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white" />
              </div>

              <div>
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">IČ / RČ</label>
                <input type="text" value={formData.ic_rc} onChange={e => setFormData({...formData, ic_rc: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white" />
              </div>

              <div>
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Firma?</label>
                <select value={formData.firma} onChange={e => setFormData({...formData, firma: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white appearance-none">
                  <option value="">Nevybráno</option>
                  <option value="Ano">Ano</option>
                  <option value="Ne">Ne</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">% Sleva? (0-40)</label>
                <input type="number" min="0" max="40" value={formData.sleva} onChange={e => setFormData({...formData, sleva: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white" />
              </div>

              <div>
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">HWB?</label>
                <input type="number" value={formData.hwb} onChange={e => setFormData({...formData, hwb: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white" />
              </div>

              <div>
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Kontaktní osoba</label>
                <input type="text" value={formData.kontaktni_osoba} onChange={e => setFormData({...formData, kontaktni_osoba: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white" />
              </div>

              <div className="sm:col-span-2">
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Kontaktní telefon (9 číslic)</label>
                <input type="tel" maxLength={9} pattern="[0-9]{9}" placeholder="Např. 777123456" title="Zadejte přesně 9 číslic bez mezer a předvolby" value={formData.kontaktni_telefon} onChange={e => setFormData({...formData, kontaktni_telefon: e.target.value})} className="w-full sm:w-1/2 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white" />
              </div>

              <div className="sm:col-span-2">
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Co jsem dělal?</label>
                <textarea rows={3} value={formData.co_jsem_delal} onChange={e => setFormData({...formData, co_jsem_delal: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white leading-relaxed" />
              </div>

              <div>
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Kdy dělal?</label>
                <input type="date" value={formData.kdy_delal} onChange={e => setFormData({...formData, kdy_delal: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white [color-scheme:dark]" />
              </div>

              <div className="sm:col-span-2">
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Co chci?</label>
                <textarea rows={3} value={formData.co_chci} onChange={e => setFormData({...formData, co_chci: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white leading-relaxed" />
              </div>

              <div>
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Kdy chci?</label>
                <input type="date" value={formData.kdy_chci} onChange={e => setFormData({...formData, kdy_chci: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white [color-scheme:dark]" />
              </div>

              <div className="sm:col-span-2">
                <label className="text-zinc-400 mb-1.5 block font-semibold text-[10px] uppercase tracking-wider">Moje poznámky</label>
                <textarea rows={2} value={formData.moje_poznamky} onChange={e => setFormData({...formData, moje_poznamky: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white" />
              </div>

              <div className="sm:col-span-2 mt-2 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50 flex flex-col sm:flex-row items-center gap-4">
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" id="camera-upload" />
                <label htmlFor="camera-upload" className="cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors w-full sm:w-auto font-medium">
                  <Camera className="w-4 h-4 text-purple-400" />
                  Vyfotit / Nahrát fotku
                </label>
                
                {formData.moje_fotka && (
                  <div className="relative">
                    <img src={formData.moje_fotka} alt="Náhled" className="h-16 w-16 object-cover rounded-lg border border-purple-500/50 shadow-lg" />
                    <button type="button" onClick={() => setFormData({...formData, moje_fotka: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 flex justify-end gap-3 mt-6 pt-5 border-t border-zinc-800 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 font-medium">
                  Zrušit
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold hover:from-blue-500 hover:to-purple-500 flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all">
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