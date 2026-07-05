import { useMemo, useState } from 'react'
import type { PractitionerProfile } from '../types'
import { getMonthlyStats } from '../lib/stats'
import {
  getAvailableMonths,
  exportMonthCsv,
  downloadCsv,
  buildMonthZip,
  downloadBlob,
  shareMonthZip,
  openComptableEmail,
  getInvoicesForMonth,
} from '../lib/export'

interface Props {
  profile: PractitionerProfile
}

/** Couleurs très contrastées par mode de paiement */
const PAYMENT_COLORS: Record<string, string> = {
  'chèque au cabinet': '#1d4ed8',
  'espèces': '#15803d',
  'virement': '#7e22ce',
  'carte bancaire': '#c2410c',
}

const FALLBACK_COLORS = ['#1d4ed8', '#15803d', '#7e22ce', '#c2410c', '#be123c']

function paymentColor(label: string, index: number): string {
  return PAYMENT_COLORS[label] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]
}

function BarChart({ stats }: { stats: ReturnType<typeof getMonthlyStats> }) {
  const chronological = useMemo(() => [...stats].reverse(), [stats])
  const maxTotal = Math.max(...chronological.map((s) => s.total), 1)

  return (
    <div className="bar-chart">
      {chronological.map((s) => (
        <div key={s.month} className="bar-chart-row">
          <span className="bar-chart-label" title={s.label}>
            {s.label}
          </span>
          <div className="bar-chart-track" title={`${s.total} € — ${s.count} consultation(s)`}>
            <div
              className="bar-chart-fill"
              style={{ width: `${Math.max((s.total / maxTotal) * 100, s.total > 0 ? 8 : 0)}%` }}
            />
            {s.total > 0 && (
              <span className="bar-chart-inner">{s.count} consult.</span>
            )}
          </div>
          <span className="bar-chart-value">{s.total} €</span>
        </div>
      ))}
    </div>
  )
}

function PaymentChart({ byPayment }: { byPayment: Record<string, number> }) {
  const entries = Object.entries(byPayment).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1

  return (
    <div className="payment-bars">
      {entries.map(([label, value], i) => {
        const pct = Math.round((value / total) * 100)
        const color = paymentColor(label, i)
        return (
          <div key={label} className="payment-bar-row">
            <span className="payment-bar-label">
              <span className="payment-swatch" style={{ background: color }} aria-hidden />
              {label}
            </span>
            <div className="payment-bar-track">
              <div
                className="payment-bar-fill"
                style={{ width: `${Math.max(pct, value > 0 ? 6 : 0)}%`, background: color }}
              />
            </div>
            <span className="payment-bar-amount">
              {value} € <small>({pct} %)</small>
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function StatsDashboard({ profile }: Props) {
  const stats = getMonthlyStats(6)
  const months = getAvailableMonths(profile.id)
  const [exportMonth, setExportMonth] = useState(months[0] ?? '')
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState('')

  const currentMonth = stats[0]

  function handleExportCsv() {
    if (!exportMonth) return
    downloadCsv(exportMonthCsv(exportMonth, profile.id), `factures_${exportMonth}.csv`)
  }

  async function handleExportZip() {
    if (!exportMonth) return
    setExporting(true)
    setMessage('')
    try {
      const blob = await buildMonthZip(profile, exportMonth)
      downloadBlob(blob, `factures_${exportMonth}.zip`)
      setMessage('Archive ZIP téléchargée')
    } catch {
      setMessage('Erreur lors de la création du ZIP')
    } finally {
      setExporting(false)
    }
  }

  async function handleShareZip() {
    if (!exportMonth) return
    setExporting(true)
    setMessage('')
    try {
      const result = await shareMonthZip(profile, exportMonth)
      if (result === 'shared') setMessage('Archive partagée')
      else if (result === 'downloaded') setMessage('ZIP téléchargé — joignez-le à votre email')
      else setMessage('Partage annulé')
    } catch {
      setMessage('Erreur')
    } finally {
      setExporting(false)
    }
  }

  async function handleEmailComptable() {
    if (!exportMonth) return
    setExporting(true)
    setMessage('')
    try {
      const result = await shareMonthZip(profile, exportMonth)
      openComptableEmail(profile, exportMonth)
      if (result === 'shared') setMessage('Archive partagée par email')
      else setMessage('ZIP téléchargé — joignez-le à l\'email comptable')
    } catch {
      setMessage('Erreur')
    } finally {
      setExporting(false)
    }
  }

  const monthCount = exportMonth ? getInvoicesForMonth(exportMonth, profile.id).length : 0

  if (stats.length === 0) {
    return (
      <div className="history-empty">
        <p>Pas encore de statistiques</p>
        <span className="history-hint">Générez des factures pour voir votre activité</span>
      </div>
    )
  }

  return (
    <div className="stats-dashboard">
      <h2>Statistiques</h2>

      <section className="stat-chart-card">
        <h3>Chiffre d&apos;affaires — 6 derniers mois</h3>
        <BarChart stats={stats} />
      </section>

      {currentMonth && (
        <section className="stat-chart-card">
          <h3>Ce mois — {currentMonth.label}</h3>
          <div className="stat-summary-row">
            <div className="stat-big">{currentMonth.total} €</div>
            <div className="stat-summary-meta">
              <span><strong>{currentMonth.count}</strong> consultation(s)</span>
              <span><strong>{currentMonth.childCount}</strong> enfant(s) · <strong>{currentMonth.adultCount}</strong> adulte(s)</span>
            </div>
          </div>
          {Object.keys(currentMonth.byPayment).length > 0 && (
            <>
              <p className="stat-subtitle">Modes de paiement</p>
              <PaymentChart byPayment={currentMonth.byPayment} />
            </>
          )}
        </section>
      )}

      {months.length > 0 && (
        <section className="stat-chart-card export-section">
          <h3>Export comptable</h3>
          <label>
            Mois
            <select value={exportMonth} onChange={(e) => setExportMonth(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          {monthCount > 0 && (
            <p className="field-hint">{monthCount} facture(s) pour ce mois</p>
          )}
          <div className="export-actions">
            <button type="button" className="btn-secondary" onClick={handleExportCsv}>
              CSV du mois
            </button>
            <button type="button" className="btn-secondary" disabled={exporting || monthCount === 0} onClick={handleExportZip}>
              {exporting ? 'Génération…' : 'ZIP (PDF + CSV)'}
            </button>
            <button type="button" className="btn-primary" disabled={exporting || monthCount === 0} onClick={handleShareZip}>
              Partager le ZIP
            </button>
            <button type="button" className="btn-text" disabled={monthCount === 0} onClick={handleEmailComptable}>
              Email comptable
            </button>
          </div>
          {message && <p className="toast">{message}</p>}
        </section>
      )}
    </div>
  )
}
