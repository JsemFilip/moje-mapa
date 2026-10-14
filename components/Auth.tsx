"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      alert("Chyba při přihlášení: " + error.message)
    }
    setLoading(false)
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-black text-gray-100 overflow-hidden p-4">
      
      {/* 1. REÁLNÉ FOTOGRAFICKÉ NOČNÍ POZADÍ */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 z-0"
        style={{ 
          backgroundImage: `url('https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2000&auto=format&fit=crop')` 
        }}
      />
      
      {/* Tmavý gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-slate-950/60 to-black/80 z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_20%,_rgba(0,0,0,0.8)_100%)] z-0" />

      {/* Světlomet v pozadí */}
      <div className="absolute top-[20%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* 2. ZÁŘÍCÍ RUSKÉ KOLO */}
      <div className="absolute top-[3%] md:top-[1%] w-[90vh] h-[90vh] max-w-[650px] max-h-[650px] flex items-center justify-center pointer-events-none z-0">
        
        {/* Rotující část kola */}
        <div className="absolute w-[80%] h-[80%] animate-[spin_100s_linear_infinite] will-change-transform">
          <svg 
            className="w-full h-full drop-shadow-[0_0_35px_rgba(168,85,247,0.5)] opacity-95" 
            viewBox="0 0 100 100"
          >
            <circle cx="50" cy="50" r="46" fill="none" stroke="url(#ferris-outer)" strokeWidth="1.2" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="#2563eb" strokeWidth="0.4" className="opacity-70" />
            <circle cx="50" cy="50" r="43.5" fill="none" stroke="#06b6d4" strokeWidth="0.2" strokeDasharray="1 2.5" />
            
            <circle cx="50" cy="50" r="18" fill="none" stroke="#db2777" strokeWidth="0.5" className="opacity-60" />
            <circle cx="50" cy="50" r="8" fill="none" stroke="#f43f5e" strokeWidth="0.4" className="opacity-40" />
            
            {[...Array(24)].map((_, i) => (
              <line
                key={i}
                x1="50"
                y1="50"
                x2={50 + 46 * Math.cos((i * 2 * Math.PI) / 24)}
                y2={50 + 46 * Math.sin((i * 2 * Math.PI) / 24)}
                stroke="url(#ferris-spokes)"
                strokeWidth="0.3"
                className="opacity-75"
              />
            ))}

            {[...Array(24)].map((_, i) => {
              const angle1 = (i * 2 * Math.PI) / 24;
              const angle2 = ((i + 1) * 2 * Math.PI) / 24;
              return (
                <line
                  key={`cross-${i}`}
                  x1={50 + 18 * Math.cos(angle1)}
                  y1={50 + 18 * Math.sin(angle1)}
                  x2={50 + 46 * Math.cos(angle2)}
                  y2={50 + 46 * Math.sin(angle2)}
                  stroke="#475569"
                  strokeWidth="0.15"
                  className="opacity-40"
                />
              )
            })}

            {[...Array(24)].map((_, i) => {
              const x = 50 + 46 * Math.cos((i * 2 * Math.PI) / 24);
              const y = 50 + 46 * Math.sin((i * 2 * Math.PI) / 24);
              const color = i % 3 === 0 ? '#67e8f9' : i % 3 === 1 ? '#f472b6' : '#fbbf24';
              return (
                <g key={`cab-${i}`}>
                  <circle cx={x} cy={y} r="2.2" fill={color} className="opacity-30 blur-[1.5px]" />
                  <circle cx={x} cy={y} r="0.9" fill="#ffffff" className="drop-shadow-[0_0_2px_white]" />
                  <line x1={x} y1={y} x2={x} y2={y + 1.2} stroke="#ffffff" strokeWidth="0.15" className="opacity-70" />
                  <rect x={x - 0.9} y={y + 1.2} width="1.8" height="1.6" fill="#1e1b4b" stroke={color} strokeWidth="0.25" rx="0.3" />
                  <circle cx={x} cy={y + 2} r="0.25" fill="#ffffff" />
                </g>
              )
            })}

            <defs>
              <linearGradient id="ferris-outer" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="35%" stopColor="#8b5cf6" />
                <stop offset="70%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <linearGradient id="ferris-spokes" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.1" />
                <stop offset="70%" stopColor="#6366f1" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.9" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        {/* Pevný stojan */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-full h-full opacity-80" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="2.8" fill="#1e293b" stroke="#64748b" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="1.2" fill="#fbbf24" className="animate-ping [animation-duration:3s]" />
            <circle cx="50" cy="50" r="0.6" fill="#ffffff" />
            
            <line x1="50" y1="50" x2="33" y2="92" stroke="url(#stand-gradient)" strokeWidth="1.2" />
            <line x1="50" y1="50" x2="67" y2="92" stroke="url(#stand-gradient)" strokeWidth="1.2" />
            <line x1="50" y1="50" x2="50" y2="92" stroke="#1e293b" strokeWidth="0.6" className="opacity-50" />
            <line x1="41" y1="70" x2="59" y2="70" stroke="#334155" strokeWidth="0.5" />
            <line x1="37.5" y1="80" x2="62.5" y2="80" stroke="#1f2937" strokeWidth="0.6" />
            
            <defs>
              <linearGradient id="stand-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#020205" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* 3. PŘIHLAŠOVACÍ FORMULÁŘ */}
      <div className="relative z-10 w-full max-w-[360px] mt-32 sm:mt-40 transition-all">
        <div className="p-8 bg-black/75 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]">
          
          <form onSubmit={handleAuth} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-zinc-400 uppercase font-bold ml-0.5">E-mail</label>
              <input
                type="email"
                placeholder="tvuj@email.cz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="p-3.5 bg-black/50 border border-zinc-800/80 rounded-lg text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all font-light"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-widest text-zinc-400 uppercase font-bold ml-0.5">Heslo</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="p-3.5 bg-black/50 border border-zinc-800/80 rounded-lg text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 p-3.5 text-[13px] text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 disabled:from-zinc-900 disabled:to-zinc-900 disabled:text-zinc-600 font-semibold tracking-wider uppercase active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(79,70,229,0.35)] hover:shadow-[0_0_35px_rgba(147,51,234,0.55)] border border-indigo-500/30 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? 'Přihlašování...' : 'Přihlásit se'}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}