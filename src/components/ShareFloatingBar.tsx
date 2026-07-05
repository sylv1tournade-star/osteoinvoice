import { ShareIconButton, WhatsAppIcon, EmailIcon, PrintIcon, ShareIcon } from './ShareIcons'

interface Props {
  generating: boolean
  onShare: (method: 'native' | 'whatsapp' | 'email') => void
  onPrint: () => void
}

export function ShareFloatingBar({ generating, onShare, onPrint }: Props) {
  return (
    <div className="share-floating-bar">
      <ShareIconButton label="Partager" variant="share" disabled={generating} onClick={() => onShare('native')}>
        <ShareIcon size={22} />
      </ShareIconButton>
      <ShareIconButton label="WhatsApp" variant="whatsapp" disabled={generating} onClick={() => onShare('whatsapp')}>
        <WhatsAppIcon size={24} />
      </ShareIconButton>
      <ShareIconButton label="Email" variant="email" disabled={generating} onClick={() => onShare('email')}>
        <EmailIcon size={24} />
      </ShareIconButton>
      <ShareIconButton label="Imprimer" variant="print" onClick={onPrint}>
        <PrintIcon size={24} />
      </ShareIconButton>
    </div>
  )
}
