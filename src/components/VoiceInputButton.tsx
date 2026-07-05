import { useSpeechInput } from '../hooks/useSpeechInput'

interface Props {
  mode?: 'text' | 'date'
  label?: string
  onResult: (value: string) => void
}

export function VoiceInputButton({ mode = 'text', label = 'Dicter', onResult }: Props) {
  const { listen, listening, supported } = useSpeechInput()

  if (!supported) return null

  async function handleClick() {
    const result = await listen(mode)
    if (!result) return
    if (mode === 'date' && result.isoDate) {
      onResult(result.isoDate)
    } else if (mode === 'date') {
      alert(`Date non reconnue : « ${result.raw} ». Essayez « 30 avril 2020 » ou « 30/04/2020 ».`)
    } else {
      onResult(result.raw)
    }
  }

  return (
    <button
      type="button"
      className={`voice-btn ${listening ? 'listening' : ''}`}
      onClick={handleClick}
      title={label}
      aria-label={label}
    >
      {listening ? '…' : '🎤'}
    </button>
  )
}
