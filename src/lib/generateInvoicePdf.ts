import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import type { InvoiceData, PractitionerProfile } from '../types'
import { InvoicePreview } from '../components/InvoicePreview'
import { formatPatientName } from './names'
import { generatePdfFromElement } from './pdf'

async function waitForImages(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'))
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalHeight > 0) {
            resolve()
            return
          }
          img.onload = () => resolve()
          img.onerror = () => resolve()
          setTimeout(resolve, 3000)
        })
    )
  )
}

export async function generateInvoicePdf(
  profile: PractitionerProfile,
  invoice: InvoiceData
): Promise<Blob> {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none'
  document.body.appendChild(container)

  const root = createRoot(container)
  root.render(createElement(InvoicePreview, { profile, invoice }))
  await waitForImages(container)

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
  return formatPatientName(invoice.patientFirstName, invoice.patientLastName)
}
