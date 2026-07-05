const CRED_KEY = 'osteofacture_webauthn_cred'

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64
  const bin = atob(padded)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

export function biometricsSupported(): boolean {
  return window.isSecureContext && typeof PublicKeyCredential !== 'undefined'
}

export async function registerBiometric(profileId: string): Promise<boolean> {
  if (!biometricsSupported()) return false

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'OsteoFacture', id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(profileId),
          name: profileId,
          displayName: 'OsteoFacture',
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null

    if (!credential?.rawId) return false
    localStorage.setItem(CRED_KEY, JSON.stringify({
      profileId,
      id: bufferToBase64url(credential.rawId),
    }))
    return true
  } catch {
    return false
  }
}

export function hasBiometric(profileId: string): boolean {
  try {
    const raw = localStorage.getItem(CRED_KEY)
    if (!raw) return false
    return (JSON.parse(raw) as { profileId: string }).profileId === profileId
  } catch {
    return false
  }
}

export async function unlockWithBiometric(profileId: string): Promise<boolean> {
  if (!hasBiometric(profileId)) return false

  try {
    const raw = localStorage.getItem(CRED_KEY)!
    const { id } = JSON.parse(raw) as { id: string }
    const challenge = crypto.getRandomValues(new Uint8Array(32))

    await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        allowCredentials: [{ id: base64urlToBuffer(id), type: 'public-key' }],
        userVerification: 'required',
      },
    })
    return true
  } catch {
    return false
  }
}
