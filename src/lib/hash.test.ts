import { describe, expect, it } from 'vitest'
import { canonicalJson, sha256Hex, shortHash } from './hash'

describe('hash', () => {
  it('canonical JSON is independent of key order and drops undefined', () => {
    expect(canonicalJson({ b: 1, a: { d: [1, undefined], c: 'x' }, e: undefined })).toBe(
      '{"a":{"c":"x","d":[1,null]},"b":1}',
    )
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }))
  })

  it('sha256 matches the known test vector', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('handles umlauts as UTF-8', async () => {
    expect(await sha256Hex('Fällung')).not.toBe(await sha256Hex('Fallung'))
  })

  it('short form for the PDF footer', () => {
    expect(shortHash('ba7816bf8f01cfea414140de')).toBe('ba78 16bf 8f01')
  })
})
