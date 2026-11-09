import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'

/**
 * In-app camera (getUserMedia) for devices where <input capture> does not open the camera,
 * i.e. laptops and desktop browsers. Several photos can be taken in a row.
 */
export function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (photo: Blob) => Promise<void> | void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string>()
  const [ready, setReady] = useState(false)
  const [count, setCount] = useState(0)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [cameras, setCameras] = useState(0)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    let cancelled = false
    const start = async () => {
      setReady(false)
      setError(undefined)
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          'Dieser Browser kann nicht auf die Kamera zugreifen. Bitte „Datei auswählen“ verwenden.',
        )
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        if (cancelled) return stream.getTracks().forEach((t) => t.stop())
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        const devices = await navigator.mediaDevices.enumerateDevices()
        setCameras(devices.filter((d) => d.kind === 'videoinput').length)
        setReady(true)
      } catch (e) {
        const name = (e as DOMException).name
        setError(
          name === 'NotAllowedError'
            ? 'Der Zugriff auf die Kamera wurde nicht erlaubt. Bitte in den Browser-Einstellungen für BaumCheck freigeben.'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? 'Es wurde keine Kamera gefunden.'
              : 'Die Kamera konnte nicht gestartet werden.',
        )
      }
    }
    void start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [facing])

  const shoot = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        setFlash(true)
        setTimeout(() => setFlash(false), 150)
        setCount((c) => c + 1)
        void onCapture(blob)
      },
      'image/jpeg',
      0.9,
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kamera"
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
    >
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Kamerabild"
          className="h-full w-full object-contain"
        />
        {flash && <div className="absolute inset-0 bg-white/70" aria-hidden="true" />}
        {!ready && !error && (
          <p className="absolute inset-0 flex items-center justify-center text-lg">
            Kamera wird gestartet …
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="absolute inset-x-4 top-1/3 rounded-xl bg-white p-4 text-center font-semibold text-red-800"
          >
            {error}
          </p>
        )}
      </div>
      <div className="pb-safe flex items-center justify-between gap-3 bg-black p-4">
        <Button variant="secondary" onClick={onClose}>
          {count > 0 ? `Fertig (${count})` : 'Schließen'}
        </Button>
        <button
          type="button"
          onClick={shoot}
          disabled={!ready}
          aria-label="Foto aufnehmen"
          className="size-20 rounded-full border-4 border-white bg-white/90 disabled:opacity-40"
        />
        {cameras > 1 ? (
          <Button
            variant="secondary"
            onClick={() => setFacing(facing === 'environment' ? 'user' : 'environment')}
          >
            Kamera wechseln
          </Button>
        ) : (
          <span className="w-24" />
        )}
      </div>
    </div>
  )
}
