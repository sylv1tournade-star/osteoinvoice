import type { InvoiceData, PractitionerProfile } from '../types'
import { getInvoices } from './invoices'

export function resolveInvoicePrefix(profile: PractitionerProfile, year = new Date().getFullYear()): string {
  let prefix = profile.invoiceNumberPrefix ?? ''
  if (profile.invoiceResetYearly && !prefix.includes(String(year))) {
    prefix = prefix || `${year}-`
  }
  return prefix
}

export function formatInvoiceNumber(profile: PractitionerProfile, sequence: number): string {
  const padding = profile.invoiceNumberPadding || 4
  const prefix = resolveInvoicePrefix(profile)
  return `${prefix}${String(sequence).padStart(padding, '0')}`
}

/** Plus grand numéro séquentiel déjà utilisé pour le préfixe courant. */
export function getMaxUsedInvoiceSequence(
  profile: PractitionerProfile,
  invoices: { invoice: InvoiceData }[]
): number {
  const prefix = resolveInvoicePrefix(profile)
  let max = 0

  for (const { invoice } of invoices) {
    const num = invoice.invoiceNumber
    if (!num.startsWith(prefix)) continue
    const tail = num.slice(prefix.length)
    const parsed = parseInt(tail, 10)
    if (!Number.isNaN(parsed)) max = Math.max(max, parsed)
  }

  return max
}

/** Évite les doublons si le compteur local a été écrasé (ex. sync cloud). */
export function ensureNextInvoiceNumber(
  profile: PractitionerProfile,
  profileId: string
): PractitionerProfile {
  const year = new Date().getFullYear()
  let next = profile.nextInvoiceNumber ?? 1

  if (profile.invoiceResetYearly && profile.lastInvoiceYear !== year) {
    next = 1
  }

  const maxUsed = getMaxUsedInvoiceSequence(profile, getInvoices(profileId))
  if (next <= maxUsed) {
    next = maxUsed + 1
  }

  if (next === profile.nextInvoiceNumber && profile.lastInvoiceYear === year) {
    return profile
  }

  return {
    ...profile,
    nextInvoiceNumber: next,
    lastInvoiceYear: year,
  }
}

export function mergeInvoiceCounters(
  local: PractitionerProfile,
  cloud: PractitionerProfile
): Pick<PractitionerProfile, 'nextInvoiceNumber' | 'lastInvoiceYear'> {
  return {
    nextInvoiceNumber: Math.max(local.nextInvoiceNumber ?? 1, cloud.nextInvoiceNumber ?? 1),
    lastInvoiceYear: Math.max(local.lastInvoiceYear ?? 0, cloud.lastInvoiceYear ?? 0),
  }
}
