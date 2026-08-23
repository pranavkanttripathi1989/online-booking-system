import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql'

// A real backend now exists for the Auth domain (see context/phase1-docker-auth-implementation-plan.md);
// other domains still have no backend and fall back to mocks. 2s was tuned for
// "no backend at all" and misread real (if slightly slow) network latency as
// "offline" — 10s gives real requests room to complete while still failing
// reasonably fast for domains that genuinely have nothing listening.
const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
  fetch: (uri, options) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    return fetch(uri, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timeoutId));
  },
})

// Auth link — attach JWT token to every request
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('medibook_token')
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      Accept: 'application/json',
    },
  }
})

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
// blank /login with no visible feedback. Now only auto-logs-out when a
// token was actually present (i.e. an established session's token was
// rejected mid-use) — a pre-auth failure has no token to invalidate.
const errorLink = onError(({ graphQLErrors }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ extensions }) => {
      if (extensions?.code === 'UNAUTHENTICATED' && localStorage.getItem('medibook_token')) {
        localStorage.removeItem('medibook_token')
        localStorage.removeItem('medibook_user')
        window.location.href = '/login'
      }
    })
  }
  // P2.7: removed the "Backend offline — using mock data" debug line.
  // errorPolicy: 'all' below already lets a query's own error surface to
  // its component (partial data + a real error, not silently swallowed) --
  // this handler's job is only the auto-logout above, not narrating a
  // fallback that most domains no longer have.
})

const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
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

