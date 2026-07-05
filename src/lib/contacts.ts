export interface PickedContact {
  firstName: string
  lastName: string
  phone: string
  email: string
}

export function contactsSupported(): boolean {
  return 'contacts' in navigator && 'ContactsManager' in window
}

export async function pickFromContacts(): Promise<PickedContact | null> {
  if (!contactsSupported()) return null

  try {
    const nav = navigator as Navigator & {
      contacts: { select: (props: string[], opts?: { multiple?: boolean }) => Promise<ContactResult[]> }
    }
    const results = await nav.contacts.select(['name', 'tel', 'email'], { multiple: false })
    if (!results?.length) return null
    const c = results[0]
    const nameParts = c.name?.[0]?.split(/\s+/) ?? []
    const lastName = nameParts.length > 1 ? nameParts.pop() ?? '' : nameParts[0] ?? ''
    const firstName = nameParts.join(' ') || lastName
    return {
      firstName,
      lastName,
      phone: c.tel?.[0] ?? '',
      email: c.email?.[0] ?? '',
    }
  } catch {
    return null
  }
}

interface ContactResult {
  name?: string[]
  tel?: string[]
  email?: string[]
}
