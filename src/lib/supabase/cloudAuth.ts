import type { PractitionerProfile } from '../../types'
import { getSupabase, isSupabaseConfigured } from './client'
import { syncBidirectional, type SyncState } from './sync'

export interface CloudSetupResult {
  state: SyncState
  message: string
  needsEmailConfirm: boolean
}

export async function registerCloudAndSync(
  profile: PractitionerProfile,
  email: string,
  password: string
): Promise<CloudSetupResult> {
  if (!isSupabaseConfigured()) {
    return { state: 'unconfigured', message: '', needsEmailConfirm: false }
  }

  const sb = getSupabase()
  if (!sb) {
    return { state: 'unconfigured', message: '', needsEmailConfirm: false }
  }

  const trimmedEmail = email.trim().toLowerCase()
  if (!trimmedEmail || password.length < 6) {
    return {
      state: 'error',
      message: 'Email et mot de passe cloud requis (6 caractères min.)',
      needsEmailConfirm: false,
    }
  }

  let session = (await sb.auth.getSession()).data.session

  if (!session) {
    const { data: signUpData, error: signUpError } = await sb.auth.signUp({
      email: trimmedEmail,
      password,
    })

    if (signUpError) {
      const alreadyExists =
        signUpError.message.toLowerCase().includes('already') ||
        signUpError.message.toLowerCase().includes('registered')

      if (alreadyExists) {
        const { data: signInData, error: signInError } = await sb.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })
        if (signInError) {
          return {
            state: 'error',
            message: signInError.message,
            needsEmailConfirm: false,
          }
        }
        session = signInData.session
      } else {
        return {
          state: 'error',
          message: signUpError.message,
          needsEmailConfirm: false,
        }
      }
    } else {
      session = signUpData.session
      if (!session && signUpData.user) {
        return {
          state: 'local',
          message: 'Compte créé — confirmez l’email reçu, puis reconnectez-vous dans Profil.',
          needsEmailConfirm: true,
        }
      }
    }
  }

  if (!session) {
    return {
      state: 'error',
      message: 'Connexion cloud impossible',
      needsEmailConfirm: false,
    }
  }

  const state = await syncBidirectional(profile)
  return {
    state,
    message: state === 'synced' ? 'Sauvegarde cloud activée' : 'Erreur de synchronisation',
    needsEmailConfirm: false,
  }
}
