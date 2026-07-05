import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function FullscreenPreview({ open, onClose, children }: Props) {
  if (!open) return null
  return (
    <div className="fullscreen-overlay" role="dialog" aria-modal="true">
      <button type="button" className="fullscreen-close" onClick={onClose} aria-label="Fermer">
        ✕
      </button>
      <div className="fullscreen-content">{children}</div>
    </div>
  )
}
