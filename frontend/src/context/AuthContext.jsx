import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { useLazyQuery } from '@apollo/client'
import { ME_QUERY } from '../graphql/queries'

// ─── Mock users for offline/demo mode ────────────────────────────────────────
// Matches mockup-data-plan.md Section 4, Feature 1 (7 accounts)
export const MOCK_USERS = {
  'admin@medibook.dev': {
    id: 'u-1', name: 'Admin User', email: 'admin@medibook.dev',
    roles: [{ name: 'admin' }, { name: 'super_admin' }],
    clinician: null, organisation: null,
    mock_token: 'mock_admin_token_001',
    mock_password: 'Admin1234!',
  },
  'manager@medibook.dev': {
    id: 'u-2', name: 'Sarah Manager', email: 'manager@medibook.dev',
    roles: [{ name: 'manager' }],
    clinician: null, organisation: { id: 'org-1', name: 'Meridian Health Group' },
    mock_token: 'mock_manager_token_002',
    mock_password: 'Mgr1234!',
  },
  'clinician@medibook.dev': {
    id: 'u-3', name: 'Dr. Sarah Mitchell', email: 'clinician@medibook.dev',
    roles: [{ name: 'clinician' }],
    clinician: { id: 'cln-1', full_name: 'Dr. Sarah Mitchell', clinician_type: { name: 'General Practitioner' } },
    organisation: null,
    mock_token: 'mock_clinician_token_003',
    mock_password: 'Cln1234!',
  },
  'receptionist@medibook.dev': {
    id: 'u-4', name: 'Sara Receptionist', email: 'receptionist@medibook.dev',
    roles: [{ name: 'staff' }],
    clinician: null, organisation: null,
    mock_token: 'mock_staff_token_004',
    mock_password: 'Rec1234!',
  },
  'patient@medibook.dev': {
    id: 'u-5', name: 'Alice Thompson', email: 'patient@medibook.dev',
    roles: [{ name: 'patient' }],
    clinician: null, patient: { id: 'pt-1', full_name: 'Alice Thompson' },
    mock_token: 'mock_patient_token_005',
    mock_password: 'Pat1234!',
  },
  'dr.okafor@medibook.dev': {
    id: 'u-6', name: 'Dr. James Okafor', email: 'dr.okafor@medibook.dev',
    roles: [{ name: 'clinician' }],
    clinician: { id: 'cln-2', full_name: 'Dr. James Okafor', clinician_type: { name: 'General Practitioner' } },
    organisation: null,
    mock_token: 'mock_clinician_token_006',
  },
  'manager2@medibook.dev': {
    id: 'u-7', name: 'Chris Manager', email: 'manager2@medibook.dev',
    roles: [{ name: 'manager' }],
    clinician: null, organisation: { id: 'org-2', name: 'CityCore Medical' },
    mock_token: 'mock_manager_token_007',
  },
}

// Post-login redirect by primary role (matches plan Section 4 Feature 1)
export function getPostLoginRedirect(user) {
  const roles = user?.roles?.map(r => r.name) ?? []
  if (roles.includes('super_admin') || roles.includes('admin')) return '/dashboard'
  if (roles.includes('manager'))   return '/manager/dashboard'
  if (roles.includes('clinician')) return '/clinician/dashboard'
  if (roles.includes('staff'))     return '/staff/dashboard'
  if (roles.includes('patient'))   return '/patient/dashboard'
  return '/dashboard'
}

// ─── Synchronous initial hydration ───────────────────────────────────────────
// Read localStorage synchronously so the very first render already knows
// whether the user is authenticated. This eliminates the auth-check spinner
// entirely for mock tokens and cached sessions.
function getInitialState() {
  const token = localStorage.getItem('medibook_token')
  if (!token) {
    return { user: null, token: null, isAuthenticated: false, isLoading: false }
  }
  if (token.startsWith('mock_')) {
    const cached = localStorage.getItem('medibook_user')
    if (cached) {
      try {
        const user = JSON.parse(cached)
        return { user, token, isAuthenticated: true, isLoading: false }
      } catch { /* fall through */ }
    }
    // Invalid cached user — clear token
    localStorage.removeItem('medibook_token')
    localStorage.removeItem('medibook_user')
    return { user: null, token: null, isAuthenticated: false, isLoading: false }
  }
  // Real JWT — need to verify async, but pre-populate from cache while waiting
  const cached = localStorage.getItem('medibook_user')
  if (cached) {
    try {
      const user = JSON.parse(cached)
      // isLoading: true so ProtectedRoute waits for ME_QUERY to confirm
      // but user sees content immediately from cache via optimistic render
      return { user, token, isAuthenticated: true, isLoading: false }
    } catch { /* fall through */ }
  }
  // No cached user — must wait for ME_QUERY
  return { user: null, token, isAuthenticated: false, isLoading: true }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.payload.user, token: action.payload.token, isAuthenticated: true, isLoading: false }
    case 'LOGOUT':
      return { user: null, token: null, isAuthenticated: false, isLoading: false }
    case 'SET_USER':
      return { ...state, user: action.payload.user, isAuthenticated: true, isLoading: false }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
export const AuthContext = createContext(null)

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, undefined, getInitialState)

  const [fetchMe, { data: meData, error: meError }] = useLazyQuery(ME_QUERY, {
    fetchPolicy: 'network-only',
  })

  // React to ME_QUERY success
  useEffect(() => {
    if (meData?.me) {
      localStorage.setItem('medibook_user', JSON.stringify(meData.me))
      dispatch({ type: 'SET_USER', payload: { user: meData.me } })
    }
  }, [meData])

  // React to ME_QUERY error — fall back to cached user
  useEffect(() => {
    if (meError) {
      const cachedUser = localStorage.getItem('medibook_user')
      if (cachedUser) {
        try {
          dispatch({ type: 'SET_USER', payload: { user: JSON.parse(cachedUser) } })
          return
        } catch { /* fall through */ }
      }
      localStorage.removeItem('medibook_token')
      localStorage.removeItem('medibook_user')
      dispatch({ type: 'LOGOUT' })
    }
  }, [meError])

  // On mount — only fetch ME if we have a real JWT with NO cached user
  useEffect(() => {
    const token = localStorage.getItem('medibook_token')
    if (token && !token.startsWith('mock_') && !localStorage.getItem('medibook_user')) {
      fetchMe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Exposed actions ───────────────────────────────────────────────────────
  const login = useCallback((token, user, rememberMe = true) => {
    // SUG-AUTH-006: rememberMe=true → localStorage, false → sessionStorage only
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem('medibook_token', token)
    storage.setItem('medibook_user', JSON.stringify(user))
    if (!rememberMe) {
      // Ensure any stale localStorage entry is cleared
      localStorage.removeItem('medibook_token')
      localStorage.removeItem('medibook_user')
    }
    // SUG-AUTH-008: store last login timestamp
    const ts = new Date().toISOString()
    localStorage.setItem('medibook_last_login', ts)
    dispatch({ type: 'LOGIN', payload: { token, user } })
  }, [])

  const logout = useCallback((apolloClient) => {
    localStorage.removeItem('medibook_token')
    localStorage.removeItem('medibook_user')
    if (apolloClient) apolloClient.clearStore()
    dispatch({ type: 'LOGOUT' })
  }, [])

  const hasRole = useCallback(
    (role) => state.user?.roles?.some((r) => r.name === role) ?? false,
    [state.user],
  )

  const hasPermission = useCallback(
    (permission) => state.user?.permissions?.some((p) => p.name === permission) ?? false,
    [state.user],
  )

  return (
    <AuthContext.Provider value={{ ...state, login, logout, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
