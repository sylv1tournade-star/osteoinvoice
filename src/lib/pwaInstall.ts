const DISMISS_KEY = 'osteofacture_install_dismissed'

export function isAppInstalled(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return true
  return false
}

export function isInstallDismissed(): boolean {
  return localStorage.getItem(DISMISS_KEY) === '1'
}

export function dismissInstallBanner() {
  localStorage.setItem(DISMISS_KEY, '1')
}

export function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
