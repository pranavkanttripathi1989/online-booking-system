import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
  fromPromise,
} from '@apollo/client'
import { onError } from '@apollo/client/link/error'

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql'

// A real backend now exists for the Auth domain (see context/phase1-docker-auth-implementation-plan.md);
// other domains still have no backend and fall back to mocks. 2s was tuned for
// "no backend at all" and misread real (if slightly slow) network latency as
// "offline" — 10s gives real requests room to complete while still failing
// reasonably fast for domains that genuinely have nothing listening.
//
// P1-02/SEC-2 — credentials:'include' sends the httpOnly session cookie
// (backend/src/auth/auth-cookies.util.ts) with every request; there is no
// longer an Authorization header attached from JS at all — no token exists
// anywhere for this code to read. The backend's CORS config (main.ts) sets
// an explicit origin + credentials:true, required for the browser to
// actually honour a cross-origin credentialed request.
const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
  credentials: 'include',
  headers: { Accept: 'application/json' },
  fetch: (uri, options) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    return fetch(uri, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timeoutId));
  },
})

function clearSessionMarkersAndRedirectToLogin() {
  localStorage.removeItem('medibook_has_session')
  localStorage.removeItem('medibook_user')
  sessionStorage.removeItem('medibook_has_session')
  sessionStorage.removeItem('medibook_user')
  window.location.href = '/login'
}

// P1-02/SEC-2 — silent refresh on 401. The access-token cookie is
// deliberately short-lived (15 min, backend/src/auth/auth.service.ts's
// ACCESS_TTL_SECONDS); without this, every user would be bounced to /login
// every 15 minutes of otherwise-active use — a real regression this slice
// must not ship. A plain fetch (not apolloClient.mutate) avoids re-entering
// this same link chain recursively; credentials:'include' sends the
// httpOnly refresh-token cookie, and the refresh mutation itself needs no
// input at all now (auth.resolver.ts falls back to the cookie when the
// input's own refresh_token is omitted) since the frontend never held that
// token as a JS-readable value to begin with.
//
// isRefreshing/pendingRequests dedupe concurrent 401s from several
// in-flight queries into a single refresh call, queueing the rest to retry
// once it resolves — the standard Apollo token-refresh link pattern.
let isRefreshing = false
let pendingRequests = []

function resolvePendingRequests() {
  pendingRequests.forEach((resolve) => resolve())
  pendingRequests = []
}

function requestRefresh() {
  return fetch(GRAPHQL_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'mutation SilentRefresh($input: RefreshInput!) { refresh(input: $input) { access_token } }', variables: { input: {} } }),
  }).then((res) => res.json())
}

// Error link — auto-logout on 401, suppress console noise when offline
//
// Found via a real e2e login test (frontend/e2e/auth-login.spec.js): this
// used to fire window.location.href = '/login' on ANY UNAUTHENTICATED
// GraphQL error, including the LOGIN mutation's own failure response for a
// wrong password. A failed login attempt was never authenticated in the
// first place — it isn't a session to log out of — but the unconditional
// full-page reload wiped SignInTab's in-flight `error` state (login.jsx's
// catch block) before the "Invalid email or password"/demo-hint message
// ever rendered, so a wrong-password attempt silently bounced back to a
// blank /login with no visible feedback.
//
// P1-02/SEC-2 — there is no token in JS to check presence of anymore
// (AuthContext.jsx's own comment on why). `medibook_has_session` is the
// same non-sensitive marker AuthContext uses for the identical purpose:
// only attempt a refresh (and only auto-logout-redirect if that refresh
// itself fails) when the app believed it had a session — a pre-auth
// failure (e.g. a wrong-password login attempt) has no session to refresh
// or invalidate, and must be left alone entirely.
const errorLink = onError(({ graphQLErrors, operation, forward }) => {
  if (!graphQLErrors) return
  const isUnauthenticated = graphQLErrors.some((e) => e.extensions?.code === 'UNAUTHENTICATED')
  if (!isUnauthenticated) return

  const hadSession = localStorage.getItem('medibook_has_session') === '1' || sessionStorage.getItem('medibook_has_session') === '1'
  // Never attempt a refresh for the refresh call itself, or a 401 has no
  // session to begin with — both cases go straight to the clean logout path.
  if (!hadSession || operation.operationName === 'SilentRefresh') {
    if (hadSession) clearSessionMarkersAndRedirectToLogin()
    return
  }

  if (!isRefreshing) {
    isRefreshing = true
    return fromPromise(
      requestRefresh()
        .then(({ data, errors }) => {
          isRefreshing = false
          if (errors || !data?.refresh?.access_token) {
            clearSessionMarkersAndRedirectToLogin()
            return false
          }
          resolvePendingRequests()
          return true
        })
        .catch(() => {
          isRefreshing = false
          clearSessionMarkersAndRedirectToLogin()
          return false
        }),
    ).flatMap((refreshed) => (refreshed ? forward(operation) : fromPromise(Promise.resolve())))
  }

  // A refresh triggered by a concurrent request is already in flight —
  // queue this operation and retry it once that refresh resolves, rather
  // than firing a second redundant refresh call.
  return fromPromise(new Promise((resolve) => pendingRequests.push(resolve))).flatMap(() => forward(operation))
})

const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Appointment: { keyFields: ['id'] },
      Clinician:   { keyFields: ['id'] },
      Patient:     { keyFields: ['id'] },
      TimeSlot:    { keyFields: ['id'] },
    },
  }),
  defaultOptions: {
    // cache-first: show cache instantly, then refresh in background.
    // This means pages render immediately on revisit without waiting for network.
    watchQuery: { errorPolicy: 'all', fetchPolicy: 'cache-first' },
    query:      { errorPolicy: 'all', fetchPolicy: 'cache-first' },
  },
  connectToDevTools: false, // avoids Apollo DevTools overhead in dev
})

export default apolloClient

