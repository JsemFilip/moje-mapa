"use client"
import { useEffect } from 'react'

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('PWA Service Worker aktivní:', reg.scope))
          .catch((err) => console.error('Chyba registrace SW:', err))
      })
    }
  }, [])

  return null
}