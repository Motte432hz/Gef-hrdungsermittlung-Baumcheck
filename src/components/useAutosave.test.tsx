import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutosave } from './useAutosave'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useAutosave', () => {
  it('saves after a pause, only when enabled and changed', async () => {
    const save = vi.fn(async () => {})
    const { result, rerender } = renderHook(
      ({ v, ok }) => useAutosave(v, save, { enabled: ok, delay: 300 }),
      { initialProps: { v: { name: '' }, ok: false } },
    )
    rerender({ v: { name: 'K' }, ok: true })
    rerender({ v: { name: 'Karl' }, ok: true })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ name: 'Karl' })
    expect(result.current).toBe('saved')

    // Same value again: nothing to save.
    rerender({ v: { name: 'Karl' }, ok: true })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('writes pending changes when unmounted', async () => {
    const save = vi.fn(async () => {})
    const { rerender, unmount } = renderHook(
      ({ v }) => useAutosave(v, save, { enabled: true, delay: 1000 }),
      { initialProps: { v: 1 } },
    )
    rerender({ v: 2 })
    unmount()
    await act(async () => {})
    expect(save).toHaveBeenCalledWith(2)
  })

  it('reports errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const save = vi.fn(async () => {
      throw new Error('quota')
    })
    const { result, rerender } = renderHook(
      ({ v }) => useAutosave(v, save, { enabled: true, delay: 10 }),
      { initialProps: { v: 1 } },
    )
    rerender({ v: 2 })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(result.current).toBe('error')
  })
})
