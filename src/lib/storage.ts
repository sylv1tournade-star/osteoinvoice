import type { PractitionerProfile, ProfileMeta, LegacyProfileFields } from '../types'
import { parseLegacyFullName } from './names'
import { removePin } from './auth'
import { deleteAllInvoices } from './invoices'
import { deleteAllPatients } from './patients'
import { deleteDraftForProfile } from './drafts'

const LEGACY_KEY = 'osteofacture_profiles'
const LEGACY_ACTIVE = 'osteofacture_active_profile'
const INDEX_KEY = 'osteofacture_profile_index'

const DEFAULT_PROFILE: Omit<PractitionerProfile, 'id'> = {
  firstName: 'Fabrice',
  lastName: 'HASSEN',
  subtitleLine1: 'Ostéopathe D.O.',
  subtitleLine2: '',
  doNumber: '13 00127 92',
  addressLine1: '76, traverse Tiboulen',
  addressLine2: '13008 MARSEILLE',
  phone: '',
  mobile: '',
  email: '',
  siret: '',
  rib: '',
  ribImage: '',
  stampImage: '/stamp-default.png?v=3',
  childPrice: 30,
  adultPrice: 60,
  nextInvoiceNumber: 1,
  invoiceNumberPrefix: '',
  invoiceNumberPadding: 4,
  invoiceResetYearly: true,
  lastInvoiceYear: new Date().getFullYear(),
  legalNotice:
    "Cette note d'honoraire tient lieu de facture. Exonération de TVA, art. 261-4-1° du CGI.",
  onboardingDone: false,
  darkMode: false,
}

function profileDataKey(id: string) {
  return `osteofacture_profile_${id}`
}

function migrateProfile(raw: PractitionerProfile & LegacyProfileFields): PractitionerProfile {
  const year = new Date().getFullYear()
  let profile: PractitionerProfile
  if (raw.firstName && raw.lastName) {
    profile = { ...raw, rib: raw.rib ?? '', ribImage: raw.ribImage ?? '' }
  } else if (raw.fullName) {
    const { firstName, lastName } = parseLegacyFullName(raw.fullName)
    profile = { ...raw, firstName, lastName, rib: raw.rib ?? '', ribImage: raw.ribImage ?? '' }
  } else {
    profile = { ...raw, rib: raw.rib ?? '', ribImage: raw.ribImage ?? '' } as PractitionerProfile
  }
  if (profile.stampImage?.startsWith('/stamp-default.png')) {
    profile.stampImage = '/stamp-default.png?v=3'
  }
  profile.invoiceNumberPrefix ??= ''
  profile.invoiceNumberPadding ??= 4
  profile.invoiceResetYearly ??= true
  profile.lastInvoiceYear ??= year
  profile.onboardingDone ??= false
  profile.darkMode ??= false
  profile.doNumber ??= ''
  return profile
}

function loadIndex(): string[] {
  migrateLegacyStorage()
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) {
      const id = 'default-hassen'
      saveProfileData({ ...DEFAULT_PROFILE, id })
      localStorage.setItem(INDEX_KEY, JSON.stringify([id]))
      return [id]
    }
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

function saveIndex(ids: string[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(ids))
}

function saveProfileData(profile: PractitionerProfile) {
  localStorage.setItem(profileDataKey(profile.id), JSON.stringify(profile))
}

function migrateLegacyStorage() {
  const legacy = localStorage.getItem(LEGACY_KEY)
  if (!legacy || localStorage.getItem(INDEX_KEY)) return

  try {
    const profiles = JSON.parse(legacy) as (PractitionerProfile & LegacyProfileFields)[]
    const ids = profiles.map((p) => p.id)
    profiles.map(migrateProfile).forEach(saveProfileData)
    saveIndex(ids.length > 0 ? ids : ['default-hassen'])
    localStorage.removeItem(LEGACY_KEY)
    localStorage.removeItem(LEGACY_ACTIVE)
  } catch {
    /* ignore */
  }
}

export function getProfileMetas(): ProfileMeta[] {
  return loadIndex()
    .map((id) => {
      const p = loadProfileData(id)
      return p ? { id: p.id, firstName: p.firstName, lastName: p.lastName } : null
    })
    .filter((m): m is ProfileMeta => m !== null)
}

export function getProfile(profileId: string): PractitionerProfile | null {
  return loadProfileData(profileId)
}

function loadProfileData(id: string): PractitionerProfile | null {
  try {
    const raw = localStorage.getItem(profileDataKey(id))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PractitionerProfile & { fullName?: string; rib?: string }
    const migrated = migrateProfile(parsed)
    const needsSave =
      parsed.fullName ||
      !parsed.firstName ||
      parsed.rib === undefined ||
      parsed.ribImage === undefined ||
      parsed.onboardingDone === undefined ||
      parsed.doNumber === undefined
    if (needsSave) saveProfileData(migrated)
    return migrated
  } catch {
    return null
  }
}

export function saveProfile(profile: PractitionerProfile) {
  saveProfileData(profile)
  const ids = loadIndex()
  if (!ids.includes(profile.id)) {
    saveIndex([...ids, profile.id])
  }
}

export function createProfile(firstName: string, lastName: string): PractitionerProfile {
  const profile: PractitionerProfile = {
    ...DEFAULT_PROFILE,
    id: crypto.randomUUID(),
    firstName: firstName.trim(),
    lastName: lastName.trim().toUpperCase(),
    stampImage: '',
    nextInvoiceNumber: 1,
  }
  saveProfile(profile)
  return profile
}

export function incrementInvoiceNumber(profileId: string): string {
  const profile = loadProfileData(profileId)
  if (!profile) return '0001'
  const year = new Date().getFullYear()
  if (profile.invoiceResetYearly && profile.lastInvoiceYear !== year) {
    profile.nextInvoiceNumber = 1
    profile.lastInvoiceYear = year
  }
  const padding = profile.invoiceNumberPadding || 4
  const num = profile.nextInvoiceNumber
  profile.nextInvoiceNumber++
  const padded = String(num).padStart(padding, '0')
  let prefix = profile.invoiceNumberPrefix ?? ''
  if (profile.invoiceResetYearly && !prefix.includes(String(year))) {
    prefix = prefix ? prefix : `${year}-`
  }
  saveProfileData(profile)
  return `${prefix}${padded}`
}

export function deleteProfile(profileId: string) {
  const ids = loadIndex().filter((id) => id !== profileId)
  if (ids.length === 0) return false
  saveIndex(ids)
  localStorage.removeItem(profileDataKey(profileId))
  removePin(profileId)
  deleteAllInvoices(profileId)
  deleteAllPatients(profileId)
  deleteDraftForProfile(profileId)
  return true
}

export function profileExists(profileId: string): boolean {
  return loadIndex().includes(profileId)
}
