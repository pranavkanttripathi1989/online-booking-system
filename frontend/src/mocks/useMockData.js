/**
 * useMockData — React hook that subscribes to the mock store.
 *
 * Usage:
 *   // Instead of: const { data } = useQuery(GET_APPOINTMENTS)
 *   const appointments = useMockData(store => store.getAppointments({ status: 'confirmed' }))
 *
 * BACKEND SWAP:
 *   Replace useMockData() calls with useQuery()/useLazyQuery() from @apollo/client.
 *   The data shape returned is identical to the GraphQL fragment shape.
 */

import { useState, useEffect, useCallback } from 'react'
import * as MockStore from './store'

/**
 * @param {(store: typeof MockStore) => any} selector - function that reads from MockStore
 * @returns {{ data: any, loading: boolean, refetch: () => void }}
 */
export function useMockData(selector) {
  const [data, setData] = useState(() => {
    try { return selector(MockStore) } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const read = useCallback(() => {
    try { setData(selector(MockStore)) } catch { /* ignore */ }
  }, [selector])

  useEffect(() => {
    // Subscribe to store changes
    const unsub = MockStore.subscribe(read)
    return unsub
  }, [read])

  return { data, loading, refetch: read, error: null }
}

/**
 * useMockMutation — simulates a GraphQL mutation.
 *
 * Usage:
 *   // Instead of: const [cancel] = useMutation(CANCEL_APPOINTMENT)
 *   const [cancel, { loading }] = useMockMutation(
 *     (id, reason) => MockStore.updateAppointmentStatus(id, 'cancelled', reason)
 *   )
 *
 * BACKEND SWAP: Replace with useMutation() from @apollo/client.
 */
export function useMockMutation(mutationFn) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      // Simulate async network delay (50ms)
      await new Promise(res => setTimeout(res, 50))
      const result = mutationFn(...args)
      setLoading(false)
      return { data: result, error: null }
    } catch (e) {
      setError(e)
      setLoading(false)
      return { data: null, error: e }
    }
  }, [mutationFn])

  return [execute, { loading, error }]
}
