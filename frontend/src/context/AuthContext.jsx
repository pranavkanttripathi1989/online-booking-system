import { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from 'react'
import { useLazyQuery, useApolloClient } from '@apollo/client'
import { ME_QUERY } from '../graphql/queries'

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
// whether the user is authenticated. A token is never trusted on its own —
// it's a real JWT or it isn't a session at all; ME_QUERY (below) is the only
// thing that actually confirms it. This function only decides whether to
// render optimistically from cache while that verification is in flight.
//
// F-02 fix: this used to special-case any token starting with "mock_" as
// pre-authenticated purely from its prefix, trusting whatever role array sat
// in localStorage.medibook_user — a two-line client-side escalation to any
// role. There is no legitimate token shape that needs that branch anymore:
// every real login path issues a real JWT, and a stale/forged token is
// rejected identically to any other invalid one, below.
function getInitialState() {
  const token = localStorage.getItem('medibook_token')
  if (!token) {
    return { user: null, token: null, isAuthenticated: false, isLoading: false }
  }
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
  const apolloClient = useApolloClient()

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

  // React to ME_QUERY error — log out.
  //
  // F-02 fix: this used to fall back to whatever user object was cached in
  // localStorage instead of logging out, so an expired, revoked, or forged
  // token kept its client-side session indefinitely — the one real check
  // that could invalidate a bad session was itself ignored on failure. A
  // rejected ME_QUERY means the server does not consider this session valid;
  // that is authoritative.
  useEffect(() => {
    if (meError) {
      localStorage.removeItem('medibook_token')
      localStorage.removeItem('medibook_user')
      sessionStorage.removeItem('medibook_token')
      sessionStorage.removeItem('medibook_user')
      dispatch({ type: 'LOGOUT' })
    }
  }, [meError])

  // On mount — verify any stored token against the server whenever we don't
  // already have a cached user to render optimistically from.
  useEffect(() => {
    const token = localStorage.getItem('medibook_token')
    if (token && !localStorage.getItem('medibook_user')) {
      fetchMe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Exposed actions ───────────────────────────────────────────────────────
  // REQ012/PLAN021 Slice 2 — sessionTimeoutMinutes comes from the org's real
  // "Auto-logout after idle" setting (login/verifyTotpLogin response),
  // never a client-chosen value. Stored alongside the token so the idle
  // timer below survives a page refresh.
  const login = useCallback((token, user, rememberMe = true, sessionTimeoutMinutes) => {
    // SUG-AUTH-006: rememberMe=true → localStorage, false → sessionStorage only
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem('medibook_token', token)
    storage.setItem('medibook_user', JSON.stringify(user))
    if (!rememberMe) {
      // Ensure any stale localStorage entry is cleared
      localStorage.removeItem('medibook_token')
      localStorage.removeItem('medibook_user')
    }
    if (sessionTimeoutMinutes) {
      storage.setItem('medibook_session_timeout_minutes', String(sessionTimeoutMinutes))
    } else {
      localStorage.removeItem('medibook_session_timeout_minutes')
      sessionStorage.removeItem('medibook_session_timeout_minutes')
    }
    // SUG-AUTH-008: store last login timestamp
    const ts = new Date().toISOString()
    localStorage.setItem('medibook_last_login', ts)
    dispatch({ type: 'LOGIN', payload: { token, user } })
  }, [])

  const logout = useCallback((client) => {
    localStorage.removeItem('medibook_token')
    localStorage.removeItem('medibook_user')
    localStorage.removeItem('medibook_session_timeout_minutes')
    sessionStorage.removeItem('medibook_token')
    sessionStorage.removeItem('medibook_user')
    sessionStorage.removeItem('medibook_session_timeout_minutes')
    const clientToUse = client || apolloClient
    if (clientToUse) clientToUse.clearStore()
    dispatch({ type: 'LOGOUT' })
  }, [apolloClient])

  // REQ012/PLAN021 Slice 2 — real client-side idle-activity auto-logout,
  // distinct from the JWT's own fixed access/refresh TTLs. Only runs when
  // the org actually set a timeout; a genuine user-interaction listener
  // (not just a fixed timer), matching the setting's own "after N min
  // *idle*" wording.
  const idleTimerRef = useRef(null)
  useEffect(() => {
    const minutes = Number(
      localStorage.getItem('medibook_session_timeout_minutes') || sessionStorage.getItem('medibook_session_timeout_minutes'),
    )
    if (!state.isAuthenticated || !minutes) return undefined

    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => logout(), minutes * 60 * 1000)
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((e) => window.addEventListener(e, resetTimer))
    resetTimer()

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [state.isAuthenticated, logout])

  const hasRole = useCallback(
    (role) => state.user?.roles?.some((r) => r.name === role) ?? false,
    [state.user],
  )

  const hasPermission = useCallback(
    (permission) => state.user?.permissions?.some((p) => p.name === permission) ?? false,
    [state.user],
  )

  // Settings' Profile tab (REQ005): patches the cached user (e.g. after a
  // name change) so header/sidebar reflect it without a re-login. Merges
  // rather than replaces, so callers only need to pass the fields that changed.
  const updateUser = useCallback((patch) => {
    const next = { ...state.user, ...patch }
    const storage = localStorage.getItem('medibook_user') !== null ? localStorage : sessionStorage
    storage.setItem('medibook_user', JSON.stringify(next))
    dispatch({ type: 'SET_USER', payload: { user: next } })
  }, [state.user])

  // REQ053/Phase G+3 — admin impersonation. `startImpersonating` takes the
  // already-minted `access_token` from the StartImpersonation mutation (the
  // caller, e.g. admin/users/index.jsx, runs that mutation itself — this
  // context has no GraphQL mutation dependency of its own beyond the
  // existing ME_QUERY lazy query).
  //
  // apollo/client.js's auth link reads the bearer token from
  // `localStorage.medibook_token` ONLY (never sessionStorage) — so
  // regardless of which storage the real admin's own session lives in
  // (rememberMe true/false), the impersonation token must land in
  // localStorage or it would silently never be sent on outgoing requests.
  // The real session is stashed in sessionStorage (short-lived, tab-scoped,
  // and distinct from the live `medibook_token`/`medibook_user` keys so a
  // stray read of those during impersonation can't resurrect the real
  // session by accident) and restored verbatim on endImpersonating().
  const [isImpersonating, setIsImpersonating] = useState(
    () => typeof window !== 'undefined' && !!sessionStorage.getItem('medibook_pre_impersonation_token'),
  )

  const startImpersonating = useCallback((accessToken) => {
    const realToken = localStorage.getItem('medibook_token') ?? sessionStorage.getItem('medibook_token')
    const realUser = localStorage.getItem('medibook_user') ?? sessionStorage.getItem('medibook_user')
    const realWasSessionOnly = !localStorage.getItem('medibook_token') && !!sessionStorage.getItem('medibook_token')

    if (realToken) sessionStorage.setItem('medibook_pre_impersonation_token', realToken)
    if (realUser) sessionStorage.setItem('medibook_pre_impersonation_user', realUser)
    sessionStorage.setItem('medibook_pre_impersonation_was_session', realWasSessionOnly ? '1' : '0')

    if (realWasSessionOnly) {
      sessionStorage.removeItem('medibook_token')
      sessionStorage.removeItem('medibook_user')
    }
    localStorage.setItem('medibook_token', accessToken)
    localStorage.removeItem('medibook_user') // force a fresh ME_QUERY load of the target's own identity

    setIsImpersonating(true)
    dispatch({ type: 'LOGIN', payload: { token: accessToken, user: null } })
    // LOGIN always sets isLoading:false (correct for a real login, which
    // already has the user object in hand) — but here `user` is
    // deliberately null until ME_QUERY resolves. Without this, the
    // caller's own immediate `navigate('/')` hits RootRoute while
    // `isAuthenticated:true` but `user:null`, and getPostLoginRedirect's
    // null-user fallback ('/dashboard') fires before the impersonated
    // user's real role is known — sending every impersonation start
    // through a flash-redirect to /dashboard that RoleGuard then rejects
    // the instant the real (non-admin) role loads a moment later.
    dispatch({ type: 'SET_LOADING', payload: true })
    fetchMe()
  }, [fetchMe])

  // Client-side restoration only — the caller is responsible for invoking
  // the EndImpersonation mutation itself (best-effort; even if that call
  // fails, restoring the stashed real session here is still correct, since
  // an impersonation token that's simply left un-ended will expire in its
  // own ≤30-minute TTL regardless).
  const endImpersonating = useCallback(() => {
    const preToken = sessionStorage.getItem('medibook_pre_impersonation_token')
    const preUser = sessionStorage.getItem('medibook_pre_impersonation_user')
    const wasSession = sessionStorage.getItem('medibook_pre_impersonation_was_session') === '1'
    sessionStorage.removeItem('medibook_pre_impersonation_token')
    sessionStorage.removeItem('medibook_pre_impersonation_user')
    sessionStorage.removeItem('medibook_pre_impersonation_was_session')
    setIsImpersonating(false)

    if (!preToken) {
      // Nothing real to restore (e.g. storage was cleared mid-session) —
      // fall back to a clean logout rather than leaving a dangling session.
      logout()
      return
    }

    localStorage.removeItem('medibook_token')
    localStorage.removeItem('medibook_user')
    sessionStorage.removeItem('medibook_token')
    sessionStorage.removeItem('medibook_user')
    const restoreStorage = wasSession ? sessionStorage : localStorage
    restoreStorage.setItem('medibook_token', preToken)
    if (preUser) restoreStorage.setItem('medibook_user', preUser)

    dispatch({ type: 'LOGIN', payload: { token: preToken, user: preUser ? JSON.parse(preUser) : null } })
    // Same defensive fallback as startImpersonating, above, for the rare
    // case there's no cached preUser to restore synchronously.
    if (!preUser) dispatch({ type: 'SET_LOADING', payload: true })
    fetchMe()
  }, [fetchMe, logout])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser, hasRole, hasPermission, isImpersonating, startImpersonating, endImpersonating }}>
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
