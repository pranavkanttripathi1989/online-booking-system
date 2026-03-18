import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:8000/graphql'

// HTTP link with a 5-second request timeout so offline backends fail fast
// instead of waiting for the browser's 60-second TCP timeout.
const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
  fetchOptions: {
    // AbortSignal with 5-second timeout — if backend doesn't respond in 5s,
    // throw a network error and let the page render with its mock data fallback.
    signal: (() => {
      // We create a new AbortController per JS module load, but Apollo
      // clones fetchOptions per request, so each fetch gets the correct signal.
      return undefined; // overridden per-request below via fetch
    })(),
  },
  // Custom fetch wrapper that injects a 5-second timeout per request
  fetch: (uri, options) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s max — fail fast so mock data shows immediately
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

