import JSZip from 'jszip'
import type { StoredInvoice, PractitionerProfile } from '../types'
import { getInvoices } from './invoices'
import { getPatients } from './patients'
import { getProfile } from './storage'
import { paymentLabel } from '../types'
import { generateInvoicePdfs } from './generateInvoicePdf'
import { formatPractitionerName, formatPatientName } from './names'

export function getInvoicesForMonth(yearMonth: string, profileId?: string): StoredInvoice[] {
  const [y, m] = yearMonth.split('-')
  return getInvoices(profileId).filter(({ createdAt }) => {
    const d = new Date(createdAt)
    return d.getFullYear() === Number(y) && d.getMonth() + 1 === Number(m)
  })
}

export function exportMonthCsv(yearMonth: string, profileId?: string): Blob {
  const rows = [
    ['N°', 'Date', 'Patient', 'Naissance', 'Consultation', 'Montant', 'Paiement', 'Email', 'Tél'].join(
      ';'
    ),
  ]

  for (const { invoice } of getInvoicesForMonth(yearMonth, profileId)) {
    rows.push(
      [
        invoice.invoiceNumber,
        invoice.invoiceDate,
        formatPatientName(invoice.patientFirstName, invoice.patientLastName),
        invoice.patientBirthDate,
        invoice.consultationDate,
        String(invoice.amount),
        paymentLabel(invoice.paymentMethod),
        invoice.patientEmail ?? '',
        invoice.patientPhone ?? '',
      ].join(';')
    )
  }

  return new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCsv(blob: Blob, filename: string) {
  downloadBlob(blob, filename)
}

export function getAvailableMonths(profileId?: string): string[] {
  const set = new Set<string>()
  for (const { createdAt } of getInvoices(profileId)) {
    const d = new Date(createdAt)
    set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return [...set].sort().reverse()
}

export function exportPractitionerDataJson(profileId: string): Blob {
  const profile = getProfile(profileId)
  const data = {
    exportedAt: new Date().toISOString(),
    format: 'osteofacture-gdpr-export-v1',
    profile,
    invoices: getInvoices(profileId),
    patients: getPatients(profileId),
  }
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
}

export async function buildMonthZip(
  profile: PractitionerProfile,
  yearMonth: string
): Promise<Blob> {
  const stored = getInvoicesForMonth(yearMonth, profile.id)
  const zip = new JSZip()

  zip.file(`recap_${yearMonth}.csv`, exportMonthCsv(yearMonth, profile.id))

  if (stored.length > 0) {
    const pdfs = await generateInvoicePdfs(
      profile,
      stored.map((s) => s.invoice)
    )
    const folder = zip.folder(`factures_${yearMonth}`)
    for (const f of pdfs) {
      folder?.file(f.filename, f.blob)
    }
  }

  return zip.generateAsync({ type: 'blob' })
}

export async function shareMonthZip(
  profile: PractitionerProfile,
  yearMonth: string
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await buildMonthZip(profile, yearMonth)
  const filename = `factures_${yearMonth}.zip`
  const file = new File([blob], filename, { type: 'application/zip' })
  const title = `Export comptable ${yearMonth}`

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title,
        text: `Factures et récapitulatif CSV — ${yearMonth}`,
        files: [file],
      })
      return 'shared'
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
    }
  }

  downloadBlob(blob, filename)
  return 'downloaded'
}

export function openComptableEmail(profile: PractitionerProfile, yearMonth: string) {
  const subject = encodeURIComponent(`Factures ostéopathie — ${yearMonth}`)
  const body = encodeURIComponent(
    `Bonjour,\n\nVeuillez trouver ci-joint l'archive ZIP du mois ${yearMonth} (factures PDF + récapitulatif CSV).\n\n` +
      `${formatPractitionerName(profile.firstName, profile.lastName)}\n\nCordialement`
  )
  window.location.href = `mailto:?subject=${subject}&body=${body}`
}
