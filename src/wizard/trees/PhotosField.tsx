import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { SpecialItem } from '../../form/schema'
import type { Attachment } from '../../domain/types'
import { db } from '../../db/db'
import { addTreePhoto, getTreePhotos, removeAttachment } from '../../db/repo'
import { resizeImage } from '../../lib/image'
import { toStoredFile } from '../../lib/storedFile'
import { useObjectUrl } from '../../lib/useObjectUrl'
import { ItemCard } from '../inputs/ItemCard'
import { ItemLabel } from '../inputs/InfoButton'
import { Notice } from '../inputs/Notice'

/** Longest side of stored photos; keeps the database and the PDF small. */
const PHOTO_MAX_PX = 1600

function Thumb({ photo, n, onRemove }: { photo: Attachment; n: number; onRemove: () => void }) {
  const url = useObjectUrl(photo.file)
  return (
    <li className="relative">
      <img src={url} alt={`Foto ${n}`} className="aspect-square w-full rounded-xl object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Foto ${n} löschen`}
        className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-full bg-black/70 text-xl text-white"
      >
        ×
      </button>
    </li>
  )
}

const pickClass =
  'inline-flex min-h-14 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-stone-300 px-4 font-semibold has-focus-visible:outline-3 dark:border-stone-600'

export function PhotosField({ item, treeId }: { item: SpecialItem; treeId: string }) {
  const photos = useLiveQuery(() => getTreePhotos(db, treeId), [treeId])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const add = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setError(undefined)
    try {
      for (const f of Array.from(files)) {
        const jpeg = await resizeImage(f, PHOTO_MAX_PX, 'image/jpeg', 0.8)
        await addTreePhoto(db, treeId, await toStoredFile(jpeg, 'image/jpeg'), f.name || 'foto.jpg')
      }
    } catch (e) {
      console.error(e)
      setError('Foto konnte nicht gespeichert werden. Bitte erneut versuchen.')
    } finally {
      setBusy(false)
    }
  }

  const remove = (p: Attachment, n: number) => {
    if (window.confirm(`Foto ${n} löschen?`)) void removeAttachment(db, p.id)
  }

  return (
    <ItemCard>
      <ItemLabel
        label={item.label}
        info="Optional. Fotos werden verkleinert gespeichert und als Anhang ins PDF übernommen."
      />
      <div className="flex flex-wrap gap-2">
        <label className={pickClass}>
          📷 Foto aufnehmen
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              void add(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
        <label className={pickClass}>
          🖼 Aus Galerie
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              void add(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </div>
      {busy && <p role="status">Foto wird gespeichert …</p>}
      {error && <Notice level="warning">{error}</Notice>}
      {photos && photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2" aria-label="Fotos">
          {photos.map((p, i) => (
            <Thumb key={p.id} photo={p} n={i + 1} onRemove={() => remove(p, i + 1)} />
          ))}
        </ul>
      )}
    </ItemCard>
  )
}
