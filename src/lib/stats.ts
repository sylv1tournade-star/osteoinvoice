import { getInvoices } from './invoices'
import { paymentLabel } from '../types'

export interface MonthStats {
  month: string
  label: string
  total: number
  count: number
  childCount: number
  adultCount: number
  byPayment: Record<string, number>
}

export function getMonthlyStats(monthsBack = 6): MonthStats[] {
  const invoices = getInvoices()
  const map = new Map<string, MonthStats>()

  for (const { invoice, createdAt } of invoices) {
    const d = new Date(createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) {
      map.set(key, {
        month: key,
        label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        total: 0,
        count: 0,
        childCount: 0,
        adultCount: 0,
        byPayment: {},
      })
    }
    const s = map.get(key)!
    s.total += invoice.amount
    s.count++
    if (invoice.isChild) s.childCount++
    else s.adultCount++
    const pl = paymentLabel(invoice.paymentMethod)
    s.byPayment[pl] = (s.byPayment[pl] ?? 0) + invoice.amount
  }

  return [...map.values()]
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, monthsBack)
}

export function getCurrentMonthTotal(): number {
  const now = new Date()
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return getMonthlyStats(12).find((s) => s.month === key)?.total ?? 0
}
