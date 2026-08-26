import { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from 'react'
import { useLazyQuery, useApolloClient, useMutation } from '@apollo/client'
import { ME_QUERY } from '../graphql/queries'
import { LOGOUT_MUTATION } from '../graphql/mutations'

// Post-login redirect by primary role (matches plan Section 4 Feature 1)
export function getPostLoginRedirect(user) {
  const roles = user?.roles?.map((r) => r.name) ?? []
  if (roles.includes('super_admin') || roles.includes('admin')) return '/dashboard'
  if (roles.includes('manager')) return '/manager/dashboard'
  if (roles.includes('clinician')) return '/clinician/dashboard'
  if (roles.includes('staff')) return '/staff/dashboard'
  if (roles.includes('patient')) return '/patient/dashboard'
  return '/dashboard'
}

// ─── Session marker ───────────────────────────────────────────────────────────
// P1-02/SEC-2 — the session credential itself is an httpOnly cookie now
// (backend/src/auth/auth-cookies.util.ts): it is never readable by this or
// any other frontend script, on purpose — that's the whole point of the
// migration off localStorage.medibook_token. `medibook_has_session` is a
// deliberately non-sensitive boolean marker only, written alongside login
// so the app can decide "is there probably a session worth verifying"
// without a network round trip on every single page load. Forging this
// flag to '1' grants nothing: it only causes an extra ME_QUERY that the
// real (cookie-less) request then correctly fails auth on — there is no
// privilege attached to the marker itself, unlike the token it replaces.
const SESSION_MARKER_KEY = 'medibook_has_session'

function hasSessionMarker() {
  return localStorage.getItem(SESSION_MARKER_KEY) === '1' || sessionStorage.getItem(SESSION_MARKER_KEY) === '1'
}

// SUG-AUTH-006: rememberMe=true keeps the marker/cached user in
// localStorage (survives a browser restart); false keeps it sessionStorage-
// only (tab-scoped). Whichever storage currently holds the marker is "the"
// active one — used everywhere a value needs to be read back or updated.
function getActiveStorage() {
  return localStorage.getItem(SESSION_MARKER_KEY) === '1' ? localStorage : sessionStorage
}

// ─── Synchronous initial hydration ───────────────────────────────────────────
// Read the marker + any cached user object synchronously so the very first
// render already has a reasonable guess. That guess is never trusted on its
// own — ME_QUERY (below, always fetched on mount whenever the marker is
// present) is the only thing that actually confirms a real session exists;
// this function only decides whether to render optimistically from cache
// while that verification is in flight, exactly as before this slice, just
// without a JS-readable token driving the decision.
function getInitialState() {
  if (!hasSessionMarker()) {
    return { user: null, isAuthenticated: false, isLoading: false }
  }
  const cached = getActiveStorage().getItem('medibook_user')
  if (cached) {
    try {
      const user = JSON.parse(cached)
      // isLoading: true so ProtectedRoute keeps waiting for ME_QUERY to
      // confirm/refresh the full record, while this optimistic value
      // already renders instead of a loading spinner.
      return { user, isAuthenticated: true, isLoading: false }
    } catch {
      /* fall through */
    }
  }
  return { user: null, isAuthenticated: false, isLoading: true }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.payload.user, isAuthenticated: true, isLoading: false }
    case 'LOGOUT':
      return { user: null, isAuthenticated: false, isLoading: false }
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
  const [logoutMutation] = useMutation(LOGOUT_MUTATION)

  const [fetchMe, { data: meData, error: meError }] = useLazyQuery(ME_QUERY, {
    fetchPolicy: 'network-only',
  })

  // React to ME_QUERY success — this is the single source of truth for the
  // cached user object; login()/startImpersonating()/endImpersonating() all
  // dispatch an immediate (uncached) optimistic value and then rely on this
  // effect to fetch and persist the real, FULL shape (patient/clinician
  // sub-objects included — ME_QUERY selects them, the login/verifyTotpLogin/
  // verifyOtp mutation responses do not). This is the actual fix for the
  // long-standing defect this file used to carry: caching the mutation's own
  // partial `user` object directly meant `user.patient.id`/`user.clinician`
  // stayed permanently undefined after a fresh login, because the fuller
  // ME_QUERY never ran once a (partial) cached user already existed.
  useEffect(() => {
    if (meData?.me) {
      getActiveStorage().setItem('medibook_user', JSON.stringify(meData.me))
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
      localStorage.removeItem(SESSION_MARKER_KEY)
      localStorage.removeItem('medibook_user')
      sessionStorage.removeItem(SESSION_MARKER_KEY)
      sessionStorage.removeItem('medibook_user')
      dispatch({ type: 'LOGOUT' })
    }
  }, [meError])

  // On mount — always verify against the server whenever the marker says a
  // session might exist. P1-02: this used to only fetch when there was no
  // cached user at all, which meant a returning visitor with a cached user
  // object was never re-checked on a fresh page load — a revoked/expired
  // session kept showing a "logged in" UI until some other query happened to
  // 401. The httpOnly cookie itself is the actual security boundary either
  // way, but the UI should not lag behind it.
  useEffect(() => {
    if (hasSessionMarker()) fetchMe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Exposed actions ───────────────────────────────────────────────────────
  // REQ012/PLAN021 Slice 2 — sessionTimeoutMinutes comes from the org's real
  // "Auto-logout after idle" setting (login/verifyTotpLogin response),
  // never a client-chosen value. Stored alongside the marker so the idle
  // timer below survives a page refresh.
  //
  // P1-02/SEC-2 — no token parameter: the httpOnly session cookie is already
  // set by the time this runs (auth.resolver.ts sets it from inside the
  // login/verifyTotpLogin/verifyOtp mutation itself, before the response
  // reaches the frontend at all). `user` is the mutation response's own
  // partial shape, used only for an immediate optimistic render — never
  // cached to storage directly; fetchMe() below fetches and persists the
  // real, full shape moments later (see the ME_QUERY-success effect above).
  const login = useCallback(
    (user, rememberMe = true, sessionTimeoutMinutes) => {
      const storage = rememberMe ? localStorage : sessionStorage
      const otherStorage = rememberMe ? sessionStorage : localStorage
      otherStorage.removeItem(SESSION_MARKER_KEY)
      otherStorage.removeItem('medibook_user')
      otherStorage.removeItem('medibook_session_timeout_minutes')

      storage.setItem(SESSION_MARKER_KEY, '1')
      if (sessionTimeoutMinutes) {
        storage.setItem('medibook_session_timeout_minutes', String(sessionTimeoutMinutes))
      } else {
        storage.removeItem('medibook_session_timeout_minutes')
      }
      // SUG-AUTH-008: store last login timestamp
      localStorage.setItem('medibook_last_login', new Date().toISOString())

      dispatch({ type: 'LOGIN', payload: { user } })
      fetchMe()
    },
    [fetchMe],
  )

  // P1-02/SEC-2 — logout is now a real server round trip, not just a local
  // storage clear: the httpOnly session cookie can only be removed by the
  // server (Set-Cookie with an expired date, auth-cookies.util.ts's
  // clearAuthCookies, wired into the logout resolver), and the refresh
  // token it's paired with must be revoked in Redis or a "logged out"
  // session's refresh token would silently remain valid for its full
  // 7-day TTL — a real, previously-unexercised gap: LOGOUT_MUTATION existed
  // in graphql/mutations.js before this slice but no page ever called it, so
  // logout() never once reached the server. Best-effort, matching this
  // file's own established endImpersonating() precedent: local state is
  // always cleared regardless of whether the network call itself succeeds,
  // so a flaky connection never traps a user in a logged-in-looking UI.
  const logout = useCallback(
    async (client) => {
      try {
        await logoutMutation()
      } catch {
        /* best-effort — clear local state regardless, see comment above */
      }
      localStorage.removeItem(SESSION_MARKER_KEY)
      localStorage.removeItem('medibook_user')
      localStorage.removeItem('medibook_session_timeout_minutes')
      sessionStorage.removeItem(SESSION_MARKER_KEY)
      sessionStorage.removeItem('medibook_user')
      sessionStorage.removeItem('medibook_session_timeout_minutes')
      const clientToUse = client || apolloClient
      if (clientToUse) await clientToUse.clearStore()
      dispatch({ type: 'LOGOUT' })
    },
    [apolloClient, logoutMutation],
  )

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

  const hasRole = useCallback((role) => state.user?.roles?.some((r) => r.name === role) ?? false, [state.user])

  const hasPermission = useCallback((permission) => state.user?.permissions?.some((p) => p.name === permission) ?? false, [state.user])

  // Settings' Profile tab (REQ005): patches the cached user (e.g. after a
  // name change) so header/sidebar reflect it without a re-login. Merges
  // rather than replaces, so callers only need to pass the fields that changed.
  const updateUser = useCallback(
    (patch) => {
      const next = { ...state.user, ...patch }
      getActiveStorage().setItem('medibook_user', JSON.stringify(next))
      dispatch({ type: 'SET_USER', payload: { user: next } })
    },
    [state.user],
  )

  // REQ053/Phase G+3 — admin impersonation.
  //
  // P1-02/SEC-2 — dramatically simpler than before this slice: the backend's
  // startImpersonation/endImpersonation resolvers now swap the httpOnly
  // session cookie themselves (auth.resolver.ts), server-side, as part of
  // the mutation the caller already runs. This context used to have to
  // stash the real session's raw token in sessionStorage and manually
  // restore it — that entire mechanism is gone. Both functions below just
  // mark the UI-only `isImpersonating` flag and re-fetch `me` to pick up
  // whichever identity the cookie now represents.
  const IMPERSONATING_FLAG_KEY = 'medibook_is_impersonating'
  const [isImpersonating, setIsImpersonating] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(IMPERSONATING_FLAG_KEY) === '1',
  )

  const startImpersonating = useCallback(() => {
    sessionStorage.setItem(IMPERSONATING_FLAG_KEY, '1')
    setIsImpersonating(true)
    // `user` deliberately null until ME_QUERY resolves. Without this, a
    // caller's own immediate navigate('/') hits RootRoute while
    // isAuthenticated:true but user:null, and getPostLoginRedirect's
    // null-user fallback ('/dashboard') fires before the impersonated
    // user's real role is known — sending every impersonation start
    // through a flash-redirect to /dashboard that RoleGuard then rejects
    // the instant the real (non-admin) role loads a moment later.
    dispatch({ type: 'LOGIN', payload: { user: null } })
    dispatch({ type: 'SET_LOADING', payload: true })
    fetchMe()
  }, [fetchMe])

  // The caller (AppShell.jsx) awaits the real EndImpersonation mutation
  // BEFORE calling this — by the time it runs, the backend has already
  // swapped the cookie back to the real actor's own session (best-effort:
  // even if that network call failed, an un-ended impersonation token
  // simply expires on its own ≤30-minute TTL regardless, so falling
  // through to a fresh fetchMe() here is still safe either way).
  const endImpersonating = useCallback(() => {
    sessionStorage.removeItem(IMPERSONATING_FLAG_KEY)
    setIsImpersonating(false)
    dispatch({ type: 'SET_LOADING', payload: true })
    fetchMe()
  }, [fetchMe])

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, updateUser, hasRole, hasPermission, isImpersonating, startImpersonating, endImpersonating }}
    >
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
