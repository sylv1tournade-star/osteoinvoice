import type { StoredInvoice, InvoiceData } from '../types'
import { requireSession } from './auth'

function invoicesKey(profileId: string) {
  return `osteofacture_invoices_${profileId}`
}

export function getInvoices(profileId?: string): StoredInvoice[] {
  const id = profileId ?? requireSession()
  try {
    const raw = localStorage.getItem(invoicesKey(id))
    if (!raw) return []
    const list = JSON.parse(raw) as StoredInvoice[]
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch {
    return []
  }
}

export function saveInvoice(invoice: InvoiceData, profileId?: string): StoredInvoice {
  const id = profileId ?? requireSession()
  const stored: StoredInvoice = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    invoice,
  }
  const list = getInvoices(id)
  list.unshift(stored)
  localStorage.setItem(invoicesKey(id), JSON.stringify(list))
  return stored
}

export function deleteInvoice(invoiceId: string, profileId?: string) {
  const id = profileId ?? requireSession()
  const list = getInvoices(id).filter((inv) => inv.id !== invoiceId)
  localStorage.setItem(invoicesKey(id), JSON.stringify(list))
}

export function deleteAllInvoices(profileId: string) {
  localStorage.removeItem(invoicesKey(profileId))
}

/** Fusionne les factures cloud (par id, garde la plus récente). Retourne le nb ajoutées/mises à jour. */
export function mergeInvoicesFromCloud(profileId: string, incoming: StoredInvoice[]): number {
  const local = getInvoices(profileId)
  const byId = new Map(local.map((s) => [s.id, s]))
  let changed = 0

  for (const item of incoming) {
    const existing = byId.get(item.id)
    if (!existing) {
      byId.set(item.id, item)
      changed++
      continue
    }
    const existingTs = new Date(existing.createdAt).getTime()
    const incomingTs = new Date(item.createdAt).getTime()
    if (incomingTs >= existingTs && incomingTs !== existingTs) {
      byId.set(item.id, item)
      changed++
    }
  }

  const merged = [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  localStorage.setItem(invoicesKey(profileId), JSON.stringify(merged))
  return changed
}

export function getInvoiceCount(profileId?: string): number {
  return getInvoices(profileId).length
}

export interface PatientSuggestion {
  patientFirstName: string
  patientLastName: string
  patientBirthDate: string
}

/** Patients uniques issus de l'historique de factures du praticien connecté */
export function getPatientSuggestions(): PatientSuggestion[] {
  const seen = new Set<string>()
  const results: PatientSuggestion[] = []

  for (const { invoice } of getInvoices()) {
    const key = `${invoice.patientLastName}|${invoice.patientFirstName}|${invoice.patientBirthDate}`
    if (seen.has(key)) continue
    seen.add(key)
    results.push({
      patientFirstName: invoice.patientFirstName,
      patientLastName: invoice.patientLastName,
      patientBirthDate: invoice.patientBirthDate,
    })
  }
  return results
}

export function searchPatients(query: string): PatientSuggestion[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return getPatientSuggestions().filter((p) => {
    const full = `${p.patientLastName} ${p.patientFirstName}`.toLowerCase()
    const reverse = `${p.patientFirstName} ${p.patientLastName}`.toLowerCase()
    return full.includes(q) || reverse.includes(q)
  })
}
