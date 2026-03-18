import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// ─── Route → Title Map ────────────────────────────────────────────────────────

const ROUTE_TITLES = {
  '/dashboard':        'Dashboard',
  '/appointments/new': 'New Booking',
  '/appointments':     'Appointments',
  '/calendar':         'Calendar',
  '/clinicians':       'Clinicians',
  '/patients':         'Patients',
  '/settings':         'Settings',
  '/profile':          'My Profile',
  '/403':              'Access Forbidden',
}

const APP_NAME = 'MediBook'

/**
 * usePageTitle — returns the human-readable title for the current route
 * and keeps document.title in sync on every navigation.
 */
export function usePageTitle() {
  const { pathname } = useLocation()

  // Match longest prefix first so /appointments/new beats /appointments
  const title =
    Object.entries(ROUTE_TITLES)
      .sort(([a], [b]) => b.length - a.length) // longest first
      .find(([route]) => pathname === route || pathname.startsWith(route + '/'))?.[1] ??
    'Page'

  useEffect(() => {
    document.title = `${title} — ${APP_NAME}`
  }, [title])

  return title
}

export default usePageTitle
