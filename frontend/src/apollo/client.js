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
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ extensions }) => {
      if (extensions?.code === 'UNAUTHENTICATED') {
        localStorage.removeItem('medibook_token')
        localStorage.removeItem('medibook_user')
        window.location.href = '/login'
      }
    })
  }
  if (networkError) {
    // Silently swallow network errors when backend is offline (demo mode)
    console.debug('[MediBook] Backend offline — using mock data.')
  }
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

