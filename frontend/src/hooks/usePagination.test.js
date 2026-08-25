import { renderHook, act } from '@testing-library/react'
import { usePagination } from './usePagination'

// REQ104
describe('usePagination', () => {
  it('populates data/pagination from a resolved {data, pageInfo} result', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      data: [{ id: '1' }, { id: '2' }],
      pageInfo: { total: 2, limit: 10, offset: 0, hasNextPage: false, hasPreviousPage: false },
    })
    const { result } = renderHook(() => usePagination(fetchFn))

    await act(async () => {
      await result.current.loadData()
    })

    expect(result.current.data).toEqual([{ id: '1' }, { id: '2' }])
    expect(result.current.pagination).toEqual({
      total: 2, limit: 10, offset: 0, hasNextPage: false, hasPreviousPage: false,
    })
    expect(result.current.loading).toBe(false)
  })

  it('falls back to defaults when pageInfo fields are missing', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ data: [] })
    const { result } = renderHook(() => usePagination(fetchFn, 25))

    await act(async () => {
      await result.current.loadData()
    })

    expect(result.current.pagination).toEqual({
      total: 0, limit: 25, offset: 0, hasNextPage: false, hasPreviousPage: false,
    })
  })

  it('does not throw when fetchFn rejects, and resolves loading to false', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const fetchFn = jest.fn().mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => usePagination(fetchFn))

    await act(async () => {
      await result.current.loadData()
    })

    expect(result.current.loading).toBe(false)
    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('debounces handleSearch, calling fetchFn once with the latest value', async () => {
    jest.useFakeTimers()
    const fetchFn = jest.fn().mockResolvedValue({ data: [], pageInfo: {} })
    const { result } = renderHook(() => usePagination(fetchFn))

    act(() => {
      result.current.handleSearch('x')
      result.current.handleSearch('xy')
    })

    await act(async () => {
      await jest.advanceTimersByTimeAsync(400)
    })

    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(fetchFn).toHaveBeenCalledWith({ search: 'xy', limit: 10, offset: 0 })
    jest.useRealTimers()
  })

  it('nextPage calls fetchFn with the next offset when hasNextPage is true', async () => {
    const fetchFn = jest.fn()
      .mockResolvedValueOnce({ data: [], pageInfo: { total: 30, limit: 10, offset: 0, hasNextPage: true, hasPreviousPage: false } })
      .mockResolvedValueOnce({ data: [], pageInfo: { total: 30, limit: 10, offset: 10, hasNextPage: true, hasPreviousPage: true } })
    const { result } = renderHook(() => usePagination(fetchFn))

    await act(async () => {
      await result.current.loadData()
    })
    await act(async () => {
      result.current.nextPage()
    })

    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(fetchFn).toHaveBeenLastCalledWith({ search: '', limit: 10, offset: 10 })
  })

  it('nextPage is a no-op when hasNextPage is false', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      data: [], pageInfo: { total: 5, limit: 10, offset: 0, hasNextPage: false, hasPreviousPage: false },
    })
    const { result } = renderHook(() => usePagination(fetchFn))

    await act(async () => {
      await result.current.loadData()
    })
    await act(async () => {
      result.current.nextPage()
    })

    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('previousPage clamps to offset 0 rather than going negative', async () => {
    const fetchFn = jest.fn()
      .mockResolvedValueOnce({ data: [], pageInfo: { total: 15, limit: 10, offset: 5, hasNextPage: false, hasPreviousPage: true } })
      .mockResolvedValueOnce({ data: [], pageInfo: { total: 15, limit: 10, offset: 0, hasNextPage: true, hasPreviousPage: false } })
    const { result } = renderHook(() => usePagination(fetchFn))

    await act(async () => {
      await result.current.loadData()
    })
    await act(async () => {
      result.current.previousPage()
    })

    expect(fetchFn).toHaveBeenLastCalledWith({ search: '', limit: 10, offset: 0 })
  })

  it('goToPage(3) with limit 10 requests offset 20', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ data: [], pageInfo: {} })
    const { result } = renderHook(() => usePagination(fetchFn))

    await act(async () => {
      result.current.goToPage(3)
    })

    expect(fetchFn).toHaveBeenCalledWith({ search: '', limit: 10, offset: 20 })
  })

  it('computes currentPage/totalPages from pagination.total/limit/offset', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      data: [], pageInfo: { total: 45, limit: 10, offset: 20, hasNextPage: true, hasPreviousPage: true },
    })
    const { result } = renderHook(() => usePagination(fetchFn))

    await act(async () => {
      await result.current.loadData()
    })

    expect(result.current.currentPage).toBe(3)
    expect(result.current.totalPages).toBe(5)
  })
})
