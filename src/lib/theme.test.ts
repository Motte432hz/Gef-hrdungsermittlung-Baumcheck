import { beforeEach, describe, expect, it } from 'vitest'
import { getThemePreference, resolveDark, setThemePreference, THEME_STORAGE_KEY } from './theme'

describe('theme', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to system', () => {
    expect(getThemePreference()).toBe('system')
  })

  it('persists a chosen preference', () => {
    setThemePreference('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(getThemePreference()).toBe('dark')
  })

  it('ignores invalid stored values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple')
    expect(getThemePreference()).toBe('system')
  })

  it.each([
    ['dark', false, true],
    ['light', true, false],
    ['system', true, true],
    ['system', false, false],
  ] as const)('resolveDark(%s, system=%s) = %s', (pref, sys, expected) => {
    expect(resolveDark(pref, sys)).toBe(expected)
  })
})
