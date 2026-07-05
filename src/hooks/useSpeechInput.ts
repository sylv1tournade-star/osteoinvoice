import { useCallback, useState } from 'react'

interface SpeechResult {
  /** Texte brut reconnu */
  raw: string
  /** Date ISO YYYY-MM-DD si détectée */
  isoDate?: string
}

/** Parse "30 avril 2020", "30/04/2020", "30 04 2020" en ISO */
function parseFrenchDate(text: string): string | undefined {
  const t = text.toLowerCase().trim()
  const slash = t.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)
  if (slash) {
    const d = slash[1].padStart(2, '0')
    const m = slash[2].padStart(2, '0')
    let y = slash[3]
    if (y.length === 2) y = `20${y}`
    return `${y}-${m}-${d}`
  }

  const months: Record<string, string> = {
    janvier: '01', février: '02', fevrier: '02', mars: '03', avril: '04',
    mai: '05', juin: '06', juillet: '07', août: '08', aout: '08',
    septembre: '09', octobre: '10', novembre: '11', décembre: '12', decembre: '12',
  }
  for (const [name, mm] of Object.entries(months)) {
    const re = new RegExp(`(\\d{1,2})\\s+${name}\\s+(\\d{4})`)
    const m = t.match(re)
    if (m) {
      return `${m[2]}-${mm}-${m[1].padStart(2, '0')}`
    }
  }
  return undefined
}

export function useSpeechInput() {
  const [listening, setListening] = useState(false)
  const [supported] = useState(() => {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  })

  const listen = useCallback((mode: 'text' | 'date' = 'text'): Promise<SpeechResult | null> => {
    return new Promise((resolve) => {
      const SR = (window as Window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition
        || (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition

      if (!SR) {
        resolve(null)
        return
      }

      const rec = new SR()
      rec.lang = 'fr-FR'
      rec.interimResults = false
      rec.maxAlternatives = 1

      setListening(true)

      rec.onresult = (ev: SpeechRecognitionEvent) => {
        const raw = ev.results[0]?.[0]?.transcript?.trim() ?? ''
        const isoDate = mode === 'date' ? parseFrenchDate(raw) : undefined
        setListening(false)
        resolve({ raw, isoDate })
      }

      rec.onerror = () => {
        setListening(false)
        resolve(null)
      }

      rec.onend = () => setListening(false)
      rec.start()
    })
  }, [])

  return { listen, listening, supported }
}
