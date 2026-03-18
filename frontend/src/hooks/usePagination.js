import { useState, useCallback, useRef } from 'react'

const DEFAULT_LIMIT = 10

/**
 * usePagination — generic server-side pagination hook
 *
 * @param {Function} fetchFn  async (searchInput) => { data: T[], pageInfo: { total, limit, offset, hasNextPage, hasPreviousPage } }
 * @param {number}   limit    page size (default 10)
 *
 * Returns: { data, pagination, searchTerm, loading, handleSearch, nextPage, previousPage, goToPage, currentPage, totalPages, loadData }
 */
export function usePagination(fetchFn, limit = DEFAULT_LIMIT) {
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({
    total: 0,
    limit,
    offset: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  const searchRef = useRef(searchTerm)
  const debounceRef = useRef(null)

  const loadData = useCallback(
    async (offset = 0, search = searchRef.current) => {
      setLoading(true)
      try {
        const result = await fetchFn({ search, limit, offset })
        setData(result?.data || [])
        setPagination({
          total: result?.pageInfo?.total ?? 0,
          limit: result?.pageInfo?.limit ?? limit,
          offset: result?.pageInfo?.offset ?? offset,
          hasNextPage: result?.pageInfo?.hasNextPage ?? false,
          hasPreviousPage: result?.pageInfo?.hasPreviousPage ?? false,
        })
      } catch (err) {
        console.error('[usePagination] fetchFn error:', err)
      } finally {
        setLoading(false)
      }
    },
    [fetchFn, limit]
  )

  const handleSearch = useCallback(
    (value) => {
      setSearchTerm(value)
      searchRef.current = value
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        loadData(0, value)
      }, 400)
    },
    [loadData]
  )

  const nextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      loadData(pagination.offset + pagination.limit)
    }
  }, [pagination, loadData])

  const previousPage = useCallback(() => {
    if (pagination.hasPreviousPage) {
      loadData(Math.max(0, pagination.offset - pagination.limit))
    }
  }, [pagination, loadData])

  const goToPage = useCallback(
    (pageNumber) => {
      const offset = (pageNumber - 1) * pagination.limit
      loadData(offset)
    },
    [pagination.limit, loadData]
  )

  const currentPage =
    pagination.limit > 0 ? Math.floor(pagination.offset / pagination.limit) + 1 : 1
  const totalPages =
    pagination.limit > 0 ? Math.ceil(pagination.total / pagination.limit) : 1

  return {
    data,
    pagination,
    searchTerm,
    loading,
    handleSearch,
    nextPage,
    previousPage,
    goToPage,
    currentPage,
    totalPages,
    loadData,
  }
}

export default usePagination
