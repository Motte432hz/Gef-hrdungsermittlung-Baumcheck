import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPref, haptic, setPref } from './devicePrefs'

afterEach(() => localStorage.clear())

describe('device preferences', () => {
  it('defaults: no sun mode, vibration on', () => {
    expect(getPref('sun')).toBe(false)
    expect(getPref('vibrate')).toBe(true)
  })
  it('remembers a change', () => {
    setPref('sun', true)
    expect(getPref('sun')).toBe(true)
  })
  it('vibrates only when allowed', () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    haptic('warn')
    expect(vibrate).toHaveBeenCalledWith([40, 60, 40])
    setPref('vibrate', false)
    haptic('tap')
    expect(vibrate).toHaveBeenCalledTimes(1)
  })
})
