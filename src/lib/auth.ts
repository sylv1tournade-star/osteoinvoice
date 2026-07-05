const SESSION_KEY = 'osteofacture_session'
const REMEMBER_KEY = 'osteofacture_remember'

export function getSession(): string | null {
  const remembered = localStorage.getItem(REMEMBER_KEY)
  if (remembered) return remembered
  return sessionStorage.getItem(SESSION_KEY)
}

export function setSession(profileId: string, remember = false) {
  sessionStorage.setItem(SESSION_KEY, profileId)
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, profileId)
  } else {
    localStorage.removeItem(REMEMBER_KEY)
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(REMEMBER_KEY)
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}

export function requireSession(): string {
  const id = getSession()
  if (!id) throw new Error('Non authentifié')
  return id
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function pinKey(profileId: string) {
  return `osteofacture_pin_${profileId}`
}

interface PinRecord {
  hash: string
  salt: string
}

export async function setPin(profileId: string, pin: string) {
  if (pin.length < 4) throw new Error('Le code PIN doit contenir au moins 4 chiffres')
  const salt = crypto.randomUUID()
  const hash = await hashPin(pin, salt)
  localStorage.setItem(pinKey(profileId), JSON.stringify({ hash, salt }))
}

export function hasPin(profileId: string): boolean {
  return localStorage.getItem(pinKey(profileId)) !== null
}

export async function verifyPin(profileId: string, pin: string): Promise<boolean> {
  const raw = localStorage.getItem(pinKey(profileId))
  if (!raw) return false
  const { hash, salt } = JSON.parse(raw) as PinRecord
  const attempt = await hashPin(pin, salt)
  return attempt === hash
}

export async function changePin(
  profileId: string,
  currentPin: string,
  newPin: string
): Promise<boolean> {
  const valid = await verifyPin(profileId, currentPin)
  if (!valid) return false
  await setPin(profileId, newPin)
  return true
}

export function removePin(profileId: string) {
  localStorage.removeItem(pinKey(profileId))
}
