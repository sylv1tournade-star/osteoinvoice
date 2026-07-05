import type { PractitionerProfile, ProfileStatusItem } from '../types'
import { hasRib } from './rib'

export function getProfileStatus(profile: PractitionerProfile): ProfileStatusItem[] {
  return [
    { id: 'name', label: 'Identité', ok: Boolean(profile.firstName && profile.lastName) },
    { id: 'stamp', label: 'Cachet', ok: Boolean(profile.stampImage) },
    { id: 'rib', label: 'RIB / virement', ok: hasRib(profile) },
    { id: 'email', label: 'Email', ok: Boolean(profile.email?.trim()) },
    { id: 'address', label: 'Adresse', ok: Boolean(profile.addressLine1?.trim()) },
  ]
}

export function profileCompletion(profile: PractitionerProfile): number {
  const items = getProfileStatus(profile)
  return Math.round((items.filter((i) => i.ok).length / items.length) * 100)
}
