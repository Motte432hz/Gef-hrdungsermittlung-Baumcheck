import { describe, expect, it } from 'vitest'
import { detectPlatform } from './install'

describe('detectPlatform', () => {
  it('detects iPhone', () => {
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios')
  })
  it('detects iPadOS posing as Mac via touch points', () => {
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('ios')
  })
  it('treats a real Mac as other', () => {
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe('other')
  })
  it('detects Android', () => {
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe('android')
  })
})
