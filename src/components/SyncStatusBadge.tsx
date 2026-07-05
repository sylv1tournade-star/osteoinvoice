import type { SyncState } from '../lib/supabase/sync'

const LABELS: Record<SyncState, string> = {
  local: 'Données locales',
  syncing: 'Synchronisation…',
  synced: 'Cloud synchronisé',
  error: 'Erreur sync',
  unconfigured: 'Cloud non configuré',
}

const CLASS: Record<SyncState, string> = {
  local: 'sync-local',
  syncing: 'sync-pending',
  synced: 'sync-ok',
  error: 'sync-error',
  unconfigured: 'sync-local',
}

interface Props {
  state: SyncState
}

export function SyncStatusBadge({ state }: Props) {
  return (
    <span className={`sync-badge ${CLASS[state]}`} title={LABELS[state]}>
      {state === 'synced' ? '☁️' : state === 'syncing' ? '↻' : '📱'} {LABELS[state]}
    </span>
  )
}
