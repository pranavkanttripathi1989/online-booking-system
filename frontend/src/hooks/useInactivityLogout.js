/**
 * useInactivityLogout — SUG-AUTH-003
 *
 * Watches mouse/keyboard/touch/scroll activity.
 * After TIMEOUT_MS of inactivity:
 *   1. Shows a 60-second warning snackbar
 *   2. Counts down and auto-logs out when it hits 0
 *
 * Usage: call this hook once inside a protected layout (e.g. AppShell).
 */
import { useEffect, useRef, useCallback } from 'react'

const TIMEOUT_MS   = 15 * 60 * 1000  // 15 min inactivity before warning
const WARNING_MS   = 60 * 1000       // 60 s countdown after warning

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']

/**
 * @param {Function} onWarn   cb(secondsLeft: number) — called every second during warning phase
 * @param {Function} onLogout cb() — called when the countdown reaches 0
 * @param {boolean}  enabled  set false to disable (e.g. on the login page)
 */
export function useInactivityLogout({ onWarn, onLogout, enabled = true }) {
  const idleTimer    = useRef(null)
  const warnTimer    = useRef(null)
  const countdownRef = useRef(null)
  const secondsLeft  = useRef(Math.round(WARNING_MS / 1000))

  const clearAllTimers = useCallback(() => {
    clearTimeout(idleTimer.current)
    clearTimeout(warnTimer.current)
    clearInterval(countdownRef.current)
  }, [])

  const startWarningCountdown = useCallback(() => {
    secondsLeft.current = Math.round(WARNING_MS / 1000)
    onWarn?.(secondsLeft.current)

    countdownRef.current = setInterval(() => {
      secondsLeft.current -= 1
      onWarn?.(secondsLeft.current)
      if (secondsLeft.current <= 0) {
        clearAllTimers()
        onLogout?.()
      }
    }, 1000)
  }, [onWarn, onLogout, clearAllTimers])

  const resetTimer = useCallback(() => {
    if (!enabled) return
    clearAllTimers()
    secondsLeft.current = Math.round(WARNING_MS / 1000)
    idleTimer.current = setTimeout(() => {
      startWarningCountdown()
    }, TIMEOUT_MS)
  }, [enabled, clearAllTimers, startWarningCountdown])

  // Attach activity listeners
  useEffect(() => {
    if (!enabled) return
    resetTimer()
    EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    return () => {
      clearAllTimers()
      EVENTS.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [enabled, resetTimer, clearAllTimers])
}
