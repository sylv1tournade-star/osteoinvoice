import type { InvoiceDraft } from '../types'
import { requireSession } from './auth'

function draftKey(profileId: string) {
  return `osteofacture_draft_${profileId}`
}

export function getDraft(profileId?: string): InvoiceDraft | null {
  const id = profileId ?? requireSession()
  try {
    const raw = localStorage.getItem(draftKey(id))
    return raw ? (JSON.parse(raw) as InvoiceDraft) : null
  } catch {
    return null
  }
}

export function saveDraft(draft: InvoiceDraft, profileId?: string) {
  const id = profileId ?? requireSession()
  localStorage.setItem(draftKey(id), JSON.stringify(draft))
}

export function clearDraft(profileId?: string) {
  const id = profileId ?? requireSession()
  localStorage.removeItem(draftKey(id))
}

export function deleteDraftForProfile(profileId: string) {
  localStorage.removeItem(draftKey(profileId))
}
