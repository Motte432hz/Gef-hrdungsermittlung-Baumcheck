import { useEffect, useState } from 'react'
import type { StoredFile } from '../domain/types'
import { storedFileToBlob } from './storedFile'

/** Object URL for a Blob or stored file, revoked automatically. */
export function useObjectUrl(source: Blob | StoredFile | undefined): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!source) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with an external resource (object URL lifecycle)
      setUrl(undefined)
      return
    }
    const blob = source instanceof Blob ? source : storedFileToBlob(source)
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [source])
  return url
}
