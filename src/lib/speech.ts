/**
 * Dictation with the browser's speech recognition (Safari, Chrome, Edge). The audio is
 * processed by the browser maker's service (Apple/Google), as with keyboard dictation.
 */
interface RecognitionResult {
  isFinal: boolean
  0: { transcript: string }
}
interface RecognitionEvent {
  resultIndex: number
  results: ArrayLike<RecognitionResult>
}
export interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start(): void
  stop(): void
}
type RecognitionCtor = new () => Recognition

function ctor(): RecognitionCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const speechSupported = () => typeof window !== 'undefined' && !!ctor()

/** Appends dictated text: separated by a space, first letter capitalised after a sentence end. */
export function appendDictation(text: string, spoken: string): string {
  const s = spoken.trim()
  if (!s) return text
  const base = text.replace(/\s+$/, '')
  if (!base) return s.charAt(0).toUpperCase() + s.slice(1)
  const sentenceEnd = /[.!?]$/.test(base)
  return `${base} ${sentenceEnd ? s.charAt(0).toUpperCase() + s.slice(1) : s}`
}

/**
 * Starts listening; `onFinal` gets each finished phrase. Returns a stop function.
 * `onEnd` is called when listening stops (also by itself after a pause).
 */
export function listen(
  onFinal: (text: string) => void,
  onEnd: (error?: string) => void,
): () => void {
  const C = ctor()
  if (!C) {
    onEnd('unsupported')
    return () => {}
  }
  const rec = new C()
  rec.lang = 'de-DE'
  rec.continuous = true
  rec.interimResults = false
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]!
      if (r.isFinal) onFinal(r[0].transcript)
    }
  }
  let error: string | undefined
  rec.onerror = (e) => {
    error = e.error
  }
  rec.onend = () => onEnd(error)
  rec.start()
  return () => rec.stop()
}

export function speechErrorMessage(code?: string): string | undefined {
  if (!code || code === 'aborted' || code === 'no-speech') return undefined
  if (code === 'not-allowed' || code === 'service-not-allowed')
    return 'Mikrofon nicht erlaubt. Bitte in den Einstellungen des Geräts freigeben.'
  if (code === 'network') return 'Spracheingabe braucht eine Internetverbindung.'
  return 'Spracheingabe hat nicht geklappt. Bitte erneut versuchen oder tippen.'
}
