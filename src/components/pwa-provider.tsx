'use client'

import { useEffect, useState } from 'react'
import { createContext, useContext } from 'react'

interface PwaContextType {
  deferredPrompt: BeforeInstallPromptEvent | null
  showInstallPrompt: boolean
  installApp: () => Promise<void>
  dismissPrompt: () => void
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const PwaContext = createContext<PwaContextType | undefined>(undefined)

export function usePwa() {
  const context = useContext(PwaContext)
  if (context === undefined) {
    throw new Error('usePwa must be used within PwaProvider')
  }
  return context
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true)
      return
    }

    const host = window.location.hostname
    const isLocalLoopback =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      host === '::1'

    // Local Next.js dev + any stale SW breaks navigations/API (FetchEvent / invalid Response).
    if (isLocalLoopback && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const r of regs) void r.unregister()
      })
      return
    }

    // Register service worker (production / non-loopback hosts only)
    const register = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/service-worker.js')
          .catch((error) => console.error('[PWA] Service worker registration failed:', error))
      }
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register)
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      
      // Check if user has dismissed the prompt before
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0
      const daysSinceDismiss = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
      
      // Show prompt if not dismissed in last 7 days
      if (daysSinceDismiss > 7 || !dismissed) {
        setShowInstallPrompt(true)
      }
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
      localStorage.removeItem('pwa-install-dismissed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('load', register)
    }
  }, [])

  const installApp = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true)
        setShowInstallPrompt(false)
      }
      
      setDeferredPrompt(null)
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error)
    }
  }

  const dismissPrompt = () => {
    setShowInstallPrompt(false)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  return (
    <PwaContext.Provider
      value={{
        deferredPrompt,
        showInstallPrompt: showInstallPrompt && !isInstalled,
        installApp,
        dismissPrompt,
      }}
    >
      {children}
    </PwaContext.Provider>
  )
}

