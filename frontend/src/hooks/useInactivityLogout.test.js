import { renderHook, act } from '@testing-library/react'
import { useInactivityLogout } from './useInactivityLogout'

// REQ104 — mirrors AuthContext.test.jsx's own fake-timer pattern
// (useFakeTimers/useRealTimers ordering, advanceTimersByTimeAsync inside
// act) to avoid the same order-dependent flakiness documented there.
describe('useInactivityLogout', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('warns after 15 minutes of inactivity and counts down every second', async () => {
    const onWarn = jest.fn()
    const onLogout = jest.fn()
    renderHook(() => useInactivityLogout({ onWarn, onLogout, enabled: true }))

    await act(async () => {
      await jest.advanceTimersByTimeAsync(15 * 60 * 1000)
    })
    expect(onWarn).toHaveBeenCalledWith(60)

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000)
    })
    expect(onWarn).toHaveBeenCalledWith(59)
    expect(onLogout).not.toHaveBeenCalled()
  })

  it('calls onLogout and stops the countdown once it reaches 0', async () => {
    const onWarn = jest.fn()
    const onLogout = jest.fn()
    renderHook(() => useInactivityLogout({ onWarn, onLogout, enabled: true }))

    await act(async () => {
      await jest.advanceTimersByTimeAsync(15 * 60 * 1000 + 60 * 1000)
    })
    expect(onLogout).toHaveBeenCalledTimes(1)

    onWarn.mockClear()
    onLogout.mockClear()
    await act(async () => {
      await jest.advanceTimersByTimeAsync(5000)
    })
    expect(onWarn).not.toHaveBeenCalled()
    expect(onLogout).not.toHaveBeenCalled()
  })

  it('a tracked activity event resets the idle timer before the warning fires', async () => {
    const onWarn = jest.fn()
    const onLogout = jest.fn()
    renderHook(() => useInactivityLogout({ onWarn, onLogout, enabled: true }))

    await act(async () => {
      await jest.advanceTimersByTimeAsync(14 * 60 * 1000)
    })
    expect(onWarn).not.toHaveBeenCalled()

    act(() => {
      window.dispatchEvent(new Event('keydown'))
    })

    await act(async () => {
      await jest.advanceTimersByTimeAsync(14 * 60 * 1000)
    })
    expect(onWarn).not.toHaveBeenCalled()

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1 * 60 * 1000)
    })
    expect(onWarn).toHaveBeenCalledWith(60)
  })

  it('never warns or logs out when enabled is false', async () => {
    const onWarn = jest.fn()
    const onLogout = jest.fn()
    renderHook(() => useInactivityLogout({ onWarn, onLogout, enabled: false }))

    await act(async () => {
      await jest.advanceTimersByTimeAsync(20 * 60 * 1000)
    })
    expect(onWarn).not.toHaveBeenCalled()
    expect(onLogout).not.toHaveBeenCalled()
  })

  it('clears timers and listeners on unmount, so no further callbacks fire', async () => {
    const onWarn = jest.fn()
    const onLogout = jest.fn()
    const removeSpy = jest.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useInactivityLogout({ onWarn, onLogout, enabled: true }))

    await act(async () => {
      await jest.advanceTimersByTimeAsync(15 * 60 * 1000)
    })
    expect(onWarn).toHaveBeenCalledWith(60)

    onWarn.mockClear()
    unmount()
    expect(removeSpy).toHaveBeenCalled()

    await act(async () => {
      await jest.advanceTimersByTimeAsync(60 * 1000)
    })
    expect(onWarn).not.toHaveBeenCalled()
    expect(onLogout).not.toHaveBeenCalled()

    removeSpy.mockRestore()
  })
})
