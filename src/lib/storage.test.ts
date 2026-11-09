import { describe, expect, it } from 'vitest'
import { formatBytes } from './storage'

describe('formatBytes', () => {
  it.each([
    [undefined, '–'],
    [0, '0 B'],
    [512, '512 B'],
    [1536, '1,5 KB'],
    [5 * 1024 * 1024, '5,0 MB'],
    [250 * 1024 * 1024, '250 MB'],
    [2.25 * 1024 ** 3, '2,3 GB'],
  ])('%s → %s', (input, expected) => {
    expect(formatBytes(input)).toBe(expected)
  })
})
