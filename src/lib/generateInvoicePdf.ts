import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import type { InvoiceData, PractitionerProfile } from '../types'
import { InvoicePreview } from '../components/InvoicePreview'
import { generatePdfFromElement } from './pdf'

export async function generateInvoicePdf(
  profile: PractitionerProfile,
  invoice: InvoiceData
): Promise<Blob> {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none'
  document.body.appendChild(container)

  const root = createRoot(container)
  root.render(createElement(InvoicePreview, { profile, invoice }))
  await new Promise((r) => setTimeout(r, 150))

  const el = container.querySelector('#invoice-preview') as HTMLElement
  const blob = await generatePdfFromElement(el)

  root.unmount()
  container.remove()
  return blob
}

export interface PdfFile {
  blob: Blob
  filename: string
}

export async function generateInvoicePdfs(
  profile: PractitionerProfile,
  invoices: InvoiceData[]
): Promise<PdfFile[]> {
  const files: PdfFile[] = []
  for (const invoice of invoices) {
    const blob = await generateInvoicePdf(profile, invoice)
    files.push({
      blob,
      filename: `facture_${invoice.patientLastName}_${invoice.consultationDate}.pdf`,
    })
  }
  return files
}

export function patientKey(invoice: InvoiceData): string {
  return `${invoice.patientLastName}|${invoice.patientFirstName}`.toLowerCase()
}

export function patientDisplayName(invoice: InvoiceData): string {
  return `${invoice.patientFirstName} ${invoice.patientLastName}`
}
