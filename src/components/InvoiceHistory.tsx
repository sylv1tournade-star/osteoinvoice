import { useEffect, useMemo, useState } from 'react'
import type { StoredInvoice, PractitionerProfile } from '../types'
import { deleteInvoice, getInvoices } from '../lib/invoices'
import { generateInvoicePdfs, patientKey, patientDisplayName } from '../lib/generateInvoicePdf'
import { sharePdfs, shareViaEmail, shareViaWhatsApp, downloadPdfs } from '../lib/share'
import { ShareIconButton, WhatsAppIcon, EmailIcon } from './ShareIcons'

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function InvoiceThumbnail({ inv }: { inv: StoredInvoice['invoice'] }) {
  const initials = `${inv.patientFirstName.charAt(0)}${inv.patientLastName.charAt(0)}`.toUpperCase()
  return (
    <div className="history-thumb" aria-hidden>
      <span className="history-thumb-initials">{initials}</span>
      <span className="history-thumb-amount">{inv.amount} €</span>
    </div>
  )
}

function matchesSearch(stored: StoredInvoice, query: string): boolean {
  const inv = stored.invoice
  const q = query.toLowerCase()
  return (
    inv.patientFirstName.toLowerCase().includes(q) ||
    inv.patientLastName.toLowerCase().includes(q) ||
    inv.invoiceNumber.toLowerCase().includes(q) ||
    `${inv.patientFirstName} ${inv.patientLastName}`.toLowerCase().includes(q)
  )
}

interface Props {
  profile: PractitionerProfile
  onSelect: (stored: StoredInvoice) => void
  onRepeat: (stored: StoredInvoice) => void
  onDelete?: () => void
  refreshKey?: number
}

export function InvoiceHistory({ profile, onSelect, onRepeat, onDelete, refreshKey = 0 }: Props) {
  const invoices = useMemo(() => getInvoices(), [refreshKey])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')

  const groups = useMemo(() => {
    const map = new Map<string, StoredInvoice[]>()
    for (const s of invoices) {
      const k = patientKey(s.invoice)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(s)
    }
    return [...map.entries()].map(([key, list]) => ({
      key,
      name: patientDisplayName(list[0].invoice),
      list: list.sort(
        (a, b) =>
          new Date(b.invoice.consultationDate).getTime() -
          new Date(a.invoice.consultationDate).getTime()
      ),
    }))
  }, [invoices])

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim()
    if (!q) return groups
    return groups
      .map((g) => ({
        ...g,
        list: g.list.filter((s) => matchesSearch(s, q)),
      }))
      .filter((g) => g.list.length > 0)
  }, [groups, searchQuery])

  useEffect(() => {
    if (searchQuery.trim()) {
      setExpanded(new Set(filteredGroups.map((g) => g.key)))
    }
  }, [searchQuery, filteredGroups])

  const selectedInvoices = invoices.filter((s) => selectedIds.has(s.id))
  const selectedPatients = new Set(selectedInvoices.map((s) => patientKey(s.invoice)))
  const samePatient = selectedPatients.size <= 1
  const patientName = selectedInvoices.length > 0 ? patientDisplayName(selectedInvoices[0].invoice) : ''

  function toggleGroup(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllForPatientKey(key: string, list: StoredInvoice[]) {
    setSelectedIds(new Set(list.map((s) => s.id)))
    setSelectMode(true)
    setExpanded((prev) => new Set(prev).add(key))
  }

  async function handleBatchShare(method: 'native' | 'whatsapp' | 'email') {
    if (selectedInvoices.length === 0 || !samePatient) return
    setGenerating(true)
    setMessage('')
    try {
      const pdfs = await generateInvoicePdfs(profile, selectedInvoices.map((s) => s.invoice))
      const count = pdfs.length
      if (method === 'native') {
        const result = await sharePdfs(pdfs, patientName)
        setMessage(result === 'shared' ? `${count} facture(s) partagée(s) !` : result === 'downloaded' ? `${count} PDF téléchargé(s)` : 'Annulé')
      } else if (method === 'whatsapp') {
        downloadPdfs(pdfs)
        shareViaWhatsApp(patientName, count)
        setMessage(`${count} PDF téléchargé(s)`)
      } else {
        downloadPdfs(pdfs)
        shareViaEmail(profile.email, patientName, count)
        setMessage(`${count} PDF téléchargé(s)`)
      }
    } catch {
      setMessage('Erreur')
    } finally {
      setGenerating(false)
    }
  }

  if (invoices.length === 0) {
    return (
      <div className="history-empty">
        <p>Aucune facture enregistrée</p>
      </div>
    )
  }

  return (
    <div className="invoice-history">
      <div className="history-toolbar">
        <h2>Historique ({invoices.length})</h2>
        <button type="button" className="btn-secondary btn-sm" onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()) }}>
          {selectMode ? 'Annuler' : 'Sélectionner'}
        </button>
      </div>

      <label className="history-search">
        Rechercher
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Nom, prénom ou n° de facture…"
          autoComplete="off"
        />
      </label>

      {selectMode && selectedIds.size > 0 && samePatient && (
        <div className="batch-actions">
          <p className="batch-info">{selectedIds.size} facture(s) — {patientName}</p>
          <div className="share-actions share-icon-row">
            <ShareIconButton label={`Envoyer ${selectedIds.size} facture(s)`} variant="share" disabled={generating} onClick={() => handleBatchShare('native')}>
              <span className="batch-count">{selectedIds.size}</span>
            </ShareIconButton>
            <ShareIconButton label="WhatsApp" variant="whatsapp" disabled={generating} onClick={() => handleBatchShare('whatsapp')}>
              <WhatsAppIcon size={22} />
            </ShareIconButton>
            <ShareIconButton label="Email" variant="email" disabled={generating} onClick={() => handleBatchShare('email')}>
              <EmailIcon size={22} />
            </ShareIconButton>
          </div>
          {message && <p className="toast">{message}</p>}
        </div>
      )}

      {filteredGroups.length === 0 && (
        <p className="history-empty-inline">Aucun résultat pour « {searchQuery} »</p>
      )}

      {filteredGroups.map(({ key, name, list }) => {
        const isOpen = expanded.has(key)
        const groupTotal = list.reduce((sum, s) => sum + s.invoice.amount, 0)
        return (
          <div key={key} className="history-group">
            <div className="history-group-header-row">
              <button
                type="button"
                className={`history-group-header ${isOpen ? 'open' : ''}`}
                onClick={() => toggleGroup(key)}
                aria-expanded={isOpen}
              >
                <span className="history-chevron">{isOpen ? '▼' : '▶'}</span>
                <strong>{name}</strong>
                <span className="history-group-meta">
                  {list.length} facture(s) · {groupTotal} €
                </span>
              </button>
              <button
                type="button"
                className="btn-text btn-sm-inline history-select-all"
                onClick={() => selectAllForPatientKey(key, list)}
              >
                Tout sélectionner
              </button>
            </div>
            {isOpen && (
              <ul className="history-list">
                {list.map((stored) => {
                  const inv = stored.invoice
                  return (
                    <li key={stored.id} className={selectedIds.has(stored.id) ? 'selected' : ''}>
                      {selectMode && (
                        <input type="checkbox" className="history-checkbox" checked={selectedIds.has(stored.id)} onChange={() => toggleSelect(stored.id)} />
                      )}
                      <InvoiceThumbnail inv={inv} />
                      <div className="history-item">
                        <div className="history-item-main">
                          <span>Consult. {formatDate(inv.consultationDate)}</span>
                          <span className="history-amount">{inv.amount} €</span>
                        </div>
                        <div className="history-item-meta">
                          <span>N° {inv.invoiceNumber}</span>
                        </div>
                        {!selectMode && (
                          <div className="history-actions-row">
                            <button type="button" className="btn-text btn-sm-inline" onClick={() => onSelect(stored)}>Voir</button>
                            <button type="button" className="btn-text btn-sm-inline" onClick={() => onRepeat(stored)}>Répéter</button>
                            <button type="button" className="history-delete-inline" onClick={() => { if (confirm('Supprimer ?')) { deleteInvoice(stored.id); onDelete?.() } }}>×</button>
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
