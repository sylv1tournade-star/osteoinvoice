import type { PatientRecord } from '../types'
import { requireSession } from './auth'

function patientsKey(profileId: string) {
  return `osteofacture_patients_${profileId}`
}

function load(profileId?: string): PatientRecord[] {
  const id = profileId ?? requireSession()
  try {
    const raw = localStorage.getItem(patientsKey(id))
    return raw ? (JSON.parse(raw) as PatientRecord[]) : []
  } catch {
    return []
  }
}

function save(list: PatientRecord[], profileId?: string) {
  const id = profileId ?? requireSession()
  localStorage.setItem(patientsKey(id), JSON.stringify(list))
}

export function getPatients(profileId?: string): PatientRecord[] {
  return load(profileId).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export function upsertPatient(
  data: Omit<PatientRecord, 'id' | 'updatedAt'> & { id?: string },
  profileId?: string
): PatientRecord {
  const list = load(profileId)
  const key = `${data.lastName}|${data.firstName}|${data.birthDate}`.toLowerCase()
  const idx = list.findIndex(
    (p) => `${p.lastName}|${p.firstName}|${p.birthDate}`.toLowerCase() === key
  )

  const record: PatientRecord = {
    id: idx >= 0 ? list[idx].id : data.id ?? crypto.randomUUID(),
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim().toUpperCase(),
    birthDate: data.birthDate,
    email: data.email?.trim() ?? '',
    phone: data.phone?.trim() ?? '',
    updatedAt: new Date().toISOString(),
  }

  if (idx >= 0) list[idx] = record
  else list.unshift(record)
  save(list, profileId)
  return record
}

export function searchPatientsDirectory(query: string, profileId?: string): PatientRecord[] {
  const q = query.trim().toLowerCase()
  const all = getPatients(profileId)
  if (!q) return all.slice(0, 8)
  return all.filter((p) => {
    const full = `${p.lastName} ${p.firstName}`.toLowerCase()
    return full.includes(q) || p.firstName.toLowerCase().includes(q)
  })
}

export function getRecentPatients(limit = 5, profileId?: string): PatientRecord[] {
  return getPatients(profileId).slice(0, limit)
}

export function deleteAllPatients(profileId: string) {
  localStorage.removeItem(patientsKey(profileId))
}

/** Fusionne les patients cloud (par id, garde le plus récent). */
export function mergePatientsFromCloud(profileId: string, incoming: PatientRecord[]): number {
  const local = load(profileId)
  const byId = new Map(local.map((p) => [p.id, p]))
  let changed = 0

  for (const item of incoming) {
    const existing = byId.get(item.id)
    if (!existing) {
      byId.set(item.id, item)
      changed++
      continue
    }
    const existingTs = new Date(existing.updatedAt).getTime()
    const incomingTs = new Date(item.updatedAt).getTime()
    if (incomingTs >= existingTs) {
      byId.set(item.id, item)
      if (incomingTs !== existingTs) changed++
    }
  }

  save([...byId.values()], profileId)
  return changed
}
