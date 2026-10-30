"use client"
import { useEffect, useState } from 'react'

export default function LoginAnimation({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    // 1. Zobrazení původního rčení
    const t1 = setTimeout(() => setStep(1), 200)
    // 2. Ruční přeškrtnutí tužkou
    const t2 = setTimeout(() => setStep(2), 1200)
    // 3. Napsání nového textu stejným stylem
    const t3 = setTimeout(() => setStep(3), 2000)
    // 4. Plynulé zhasnutí celé obrazovky
    const t4 = setTimeout(() => setStep(4), 4000)
    // 5. Návrat na mapu
    const t5 = setTimeout(() => onFinish(), 4700)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      clearTimeout(t5)
    }
  }, [onFinish])

  return (
    <div 
      onClick={onFinish}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950 px-6 cursor-pointer select-none transition-opacity duration-700 ${
        step === 4 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg space-y-4">
        
        {/* Původní text */}
        <div className={`relative inline-block transition-all duration-500 transform ${
          step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}>
          <p className={`text-lg sm:text-2xl font-serif italic tracking-wide transition-colors duration-500 px-3 py-1 ${
            step >= 2 ? 'text-zinc-500' : 'text-zinc-200'
          }`}>
            „S poctivostí nejdál dojdeš“
          </p>

          {/* Autentické ruční škrtnutí tužkou */}
          <svg 
            className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-6 pointer-events-none overflow-visible" 
            viewBox="0 0 320 20" 
            preserveAspectRatio="none"
          >
            <defs>
              {/* Filtr pro zrnitou, lehce roztřesenou hranu tuhy tužky */}
              <filter id="pencil-texture" x="-10%" y="-20%" width="120%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>

            {/* Hlavní grafitový tah tužkou */}
            <path
              d="M 6 13 C 65 7, 130 15, 195 9 C 240 5, 280 13, 314 9"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2.2"
              strokeLinecap="round"
              filter="url(#pencil-texture)"
              style={{
                strokeDasharray: 330,
                strokeDashoffset: step >= 2 ? 0 : 330,
                transition: 'stroke-dashoffset 0.6s cubic-bezier(0.5, 0, 0.25, 1)'
              }}
            />

            {/* Druhý lehký přetah podtrhující ruční kresbu */}
            <path
              d="M 12 11 C 75 13, 140 8, 205 12 C 250 8, 285 10, 308 11"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.2"
              strokeOpacity="0.75"
              strokeLinecap="round"
              filter="url(#pencil-texture)"
              style={{
                strokeDasharray: 320,
                strokeDashoffset: step >= 2 ? 0 : 320,
                transition: 'stroke-dashoffset 0.55s cubic-bezier(0.5, 0, 0.25, 1) 0.05s'
              }}
            />
          </svg>
        </div>

        {/* Nový text – stejný font, velikost i styl jako nahoře */}
        <div className={`transition-all duration-700 transform ${
          step >= 3 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'
        }`}>
          <p className="text-lg sm:text-2xl font-serif italic tracking-wide text-zinc-100 px-3 py-1">
            „S kolotočem nejvíc vyděláš“
          </p>
        </div>

        <p className="absolute -bottom-20 text-[10px] uppercase font-bold tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors">
          Kliknutím přeskočit
        </p>

      </div>
    </div>
  )
}