export interface PractitionerProfile {
  id: string
  firstName: string
  lastName: string
  subtitleLine1: string
  subtitleLine2: string
  /** Numéro D.O. (ex: 13 00127 92) */
  doNumber: string
  addressLine1: string
  addressLine2: string
  phone: string
  mobile: string
  email: string
  siret: string
  rib: string
  ribImage: string
  stampImage: string
  childPrice: number
  adultPrice: number
  nextInvoiceNumber: number
  /** Préfixe n° facture (ex: "2026-") */
  invoiceNumberPrefix: string
  /** Chiffres du compteur (ex: 4 → 0001) */
  invoiceNumberPadding: number
  /** Remise à zéro chaque année */
  invoiceResetYearly: boolean
  lastInvoiceYear: number
  legalNotice: string
  onboardingDone: boolean
  darkMode: boolean
}

export interface PatientRecord {
  id: string
  firstName: string
  lastName: string
  birthDate: string
  email: string
  phone: string
  updatedAt: string
}

export interface InvoiceData {
  patientFirstName: string
  patientLastName: string
  patientBirthDate: string
  patientEmail?: string
  patientPhone?: string
  consultationDate: string
  invoiceDate: string
  invoiceNumber: string
  amount: number
  isChild: boolean
  paymentMethod: string
}

export interface InvoiceDraft {
  step: number
  firstName: string
  lastName: string
  birthDate: string
  patientEmail: string
  patientPhone: string
  consultationDate: string
  paymentMethod: string
  savedAt: string
}

export interface StoredInvoice {
  id: string
  createdAt: string
  invoice: InvoiceData
}

export interface ProfileMeta {
  id: string
  firstName: string
  lastName: string
}

export interface AuthSession {
  profileId: string
}

export interface LegacyProfileFields {
  fullName?: string
  doNumber?: string
  adeliNumber?: string
}

export interface ProfileStatusItem {
  id: string
  label: string
  ok: boolean
}

export const PAYMENT_LABELS: Record<string, string> = {
  cheque: 'chèque au cabinet',
  especes: 'espèces',
  virement: 'virement',
  carte: 'carte bancaire',
}

export function paymentLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? method
}

export function isVirement(method: string): boolean {
  return method === 'virement'
}
