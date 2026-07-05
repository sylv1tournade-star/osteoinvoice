/** Enfant = moins de 18 ans à la date de consultation */
export function isChildAtDate(birthDate: string, referenceDate: string): boolean {
  const birth = new Date(birthDate)
  const ref = new Date(referenceDate)
  if (Number.isNaN(birth.getTime()) || Number.isNaN(ref.getTime())) return false

  let age = ref.getFullYear() - birth.getFullYear()
  const monthDiff = ref.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age--
  }
  return age < 18
}

export function computePrice(
  birthDate: string,
  consultationDate: string,
  childPrice: number,
  adultPrice: number
): { amount: number; isChild: boolean } {
  const isChild = isChildAtDate(birthDate, consultationDate)
  return { amount: isChild ? childPrice : adultPrice, isChild }
}

export function formatInvoiceNumber(n: number): string {
  return String(n).padStart(8, '0')
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
