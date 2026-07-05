import type { PractitionerProfile, StoredInvoice, PatientRecord, InvoiceData } from '../../types'
import { getSupabase, isSupabaseConfigured } from './client'
import { requireSession } from '../auth'
import { getProfile, saveProfile } from '../storage'
import { getInvoices, mergeInvoicesFromCloud } from '../invoices'
import { getPatients, mergePatientsFromCloud } from '../patients'

export type SyncState = 'local' | 'syncing' | 'synced' | 'error' | 'unconfigured'

export async function syncToCloud(profile: PractitionerProfile): Promise<SyncState> {
  const sb = getSupabase()
  if (!sb) return 'unconfigured'

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return 'local'

  try {
    await sb.from('practitioner_profiles').upsert({
      user_id: user.id,
      profile_data: profile,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    const invoices = getInvoices(profile.id)
    if (invoices.length > 0) {
      await sb.from('invoices').upsert(
        invoices.map((s: StoredInvoice) => ({
          user_id: user.id,
          local_id: s.id,
          invoice_data: s,
          created_at: s.createdAt,
        })),
        { onConflict: 'user_id,local_id' }
      )
    }

    const patients = getPatients(profile.id)
    if (patients.length > 0) {
      await sb.from('patients').upsert(
        patients.map((p: PatientRecord) => ({
          user_id: user.id,
          local_id: p.id,
          patient_data: p,
          updated_at: p.updatedAt,
        })),
        { onConflict: 'user_id,local_id' }
      )
    }

    return 'synced'
  } catch {
    return 'error'
  }
}

export async function pullFromCloud(localProfileId: string): Promise<SyncState> {
  const sb = getSupabase()
  if (!sb) return 'unconfigured'

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return 'local'

  try {
    const { data: profileRow } = await sb
      .from('practitioner_profiles')
      .select('profile_data, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileRow?.profile_data) {
      const cloud = profileRow.profile_data as PractitionerProfile
      const local = getProfile(localProfileId)
      if (local) {
        saveProfile({
          ...local,
          ...cloud,
          id: localProfileId,
        })
      }
    }

    const { data: invoiceRows } = await sb
      .from('invoices')
      .select('local_id, invoice_data, created_at')
      .eq('user_id', user.id)

    if (invoiceRows?.length) {
      mergeInvoicesFromCloud(
        localProfileId,
        invoiceRows.map((r) => ({
          id: r.local_id,
          createdAt: r.created_at,
          invoice: r.invoice_data as InvoiceData,
        }))
      )
    }

    const { data: patientRows } = await sb
      .from('patients')
      .select('local_id, patient_data, updated_at')
      .eq('user_id', user.id)

    if (patientRows?.length) {
      mergePatientsFromCloud(
        localProfileId,
        patientRows.map((r) => ({
          ...(r.patient_data as PatientRecord),
          id: r.local_id,
          updatedAt: r.updated_at ?? new Date().toISOString(),
        }))
      )
    }

    return 'synced'
  } catch {
    return 'error'
  }
}

/** Récupère le cloud puis renvoie les données locales vers le cloud. */
export async function syncBidirectional(profile: PractitionerProfile): Promise<SyncState> {
  const pullState = await pullFromCloud(profile.id)
  if (pullState === 'error' || pullState === 'unconfigured') return pullState

  const local = getProfile(profile.id) ?? profile
  return syncToCloud(local)
}

export async function runAutoSync(): Promise<SyncState> {
  if (!isSupabaseConfigured()) return 'unconfigured'
  const sb = getSupabase()
  if (!sb) return 'unconfigured'

  const { data: { session } } = await sb.auth.getSession()
  if (!session) return 'local'

  try {
    const profileId = requireSession()
    const profile = getProfile(profileId)
    if (!profile) return 'error'
    return await syncBidirectional(profile)
  } catch {
    return 'local'
  }
}
