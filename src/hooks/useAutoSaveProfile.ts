import { useEffect, useRef, useState } from 'react'
import type { PractitionerProfile } from '../types'
import { saveProfile } from '../lib/storage'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useAutoSaveProfile(
  form: PractitionerProfile,
  profileId: string,
  onSaved: () => void
) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const isFirst = useRef(true)
  const snapshot = useRef(JSON.stringify(form))

  useEffect(() => {
    if (form.id !== profileId) return

    if (isFirst.current) {
      isFirst.current = false
      snapshot.current = JSON.stringify(form)
      return
    }

    const current = JSON.stringify(form)
    if (current === snapshot.current) return

    setStatus('saving')
    const timer = setTimeout(() => {
      try {
        saveProfile({ ...form, lastName: form.lastName.toUpperCase() })
        snapshot.current = current
        setStatus('saved')
        onSaved()
        setTimeout(() => setStatus('idle'), 2000)
      } catch {
        setStatus('error')
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [form, profileId, onSaved])

  function saveNow(next: PractitionerProfile) {
    saveProfile({ ...next, lastName: next.lastName.toUpperCase() })
    snapshot.current = JSON.stringify(next)
    setStatus('saved')
    onSaved()
    setTimeout(() => setStatus('idle'), 2000)
  }

  return { status, saveNow }
}
