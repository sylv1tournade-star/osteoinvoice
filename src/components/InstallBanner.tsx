import { useEffect, useState } from 'react'
import {
  isAppInstalled,
  isInstallDismissed,
  dismissInstallBanner,
  isIOS,
  type BeforeInstallPromptEvent,
} from '../lib/pwaInstall'

export function InstallBanner() {
  const [visible, setVisible] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isAppInstalled() || isInstallDismissed()) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // iOS : pas de prompt auto — afficher instructions
    if (isIOS() && !isAppInstalled()) {
      setVisible(true)
    }

    // Android/desktop : parfois pas d'event immédiat
    const t = setTimeout(() => {
      if (!isAppInstalled() && !isInstallDismissed() && !isIOS()) {
        setVisible(true)
      }
    }, 3000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(t)
    }
  }, [])

  if (!visible || isAppInstalled()) return null

  async function handleInstall() {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') {
        setVisible(false)
      }
    }
  }

  function handleDismiss() {
    dismissInstallBanner()
    setVisible(false)
  }

  return (
    <div className="install-banner" role="region" aria-label="Installer l'application">
      <div className="install-banner-content">
        <img src="/icon-512.png" alt="" className="install-banner-icon" />
        <div>
          <strong>Installer OsteoFacture</strong>
          <p>
            {isIOS()
              ? 'Safari → Partager → Sur l\'écran d\'accueil'
              : 'Accès rapide depuis votre écran d\'accueil, comme une vraie app'}
          </p>
        </div>
      </div>
      <div className="install-banner-actions">
        {!isIOS() && deferred && (
          <button type="button" className="btn-primary btn-sm" onClick={handleInstall}>
            Installer
          </button>
        )}
        <button type="button" className="btn-text btn-sm" onClick={handleDismiss}>
          Plus tard
        </button>
      </div>
    </div>
  )
}
