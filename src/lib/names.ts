/** Affiche "Sylvain Tournade" (prénom puis nom) */
export function formatPatientName(firstName: string, lastName: string): string {
  const first = capitalize(firstName.trim())
  const last = capitalize(lastName.trim())
  return `${first} ${last}`
}

/** Affiche "Fabrice Hassen" (prénom puis nom) */
export function formatPractitionerName(firstName: string, lastName: string): string {
  const first = capitalize(firstName.trim())
  const last = lastName.trim().toUpperCase()
  return `${first} ${last.charAt(0) + last.slice(1).toLowerCase()}`
}

function capitalize(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

/** Convertit "HASSEN FABRICE" → prénom/nom */
export function parseLegacyFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) {
    return { firstName: capitalize(parts[0] ?? ''), lastName: '' }
  }
  // Format legacy : NOM PRÉNOM en majuscules
  const lastName = parts[0]
  const firstName = parts.slice(1).join(' ')
  return { firstName: capitalize(firstName), lastName: lastName.toUpperCase() }
}

export function searchProfiles<T extends { firstName: string; lastName: string }>(
  items: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((p) => {
    const display = formatPractitionerName(p.firstName, p.lastName).toLowerCase()
    const reverse = `${p.lastName} ${p.firstName}`.toLowerCase()
    return display.includes(q) || reverse.includes(q) || p.lastName.toLowerCase().includes(q)
  })
}
