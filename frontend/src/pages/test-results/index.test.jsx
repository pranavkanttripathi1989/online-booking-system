import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { SnackbarProvider } from 'notistack'
import TestResults from './index'
import { TEST_RESULTS_QUERY } from '../../graphql/queries'
import { RECORD_TEST_RESULT_MUTATION } from '../../graphql/mutations'

// REQ133 (F-14 residue) — this page had zero test coverage before this
// slice. Confirms the {data, paginatorInfo} migration (Hard Rule 7 — the
// query shape changed, and this is the one real consumer) and a real bug
// found and fixed while touching the same lines: the old useMock fallback
// ("apiResults.length === 0 && !loading") fell back to fabricated
// MOCK_RESULTS on any real *empty* result, not just a genuine network
// error — matching the same class of bug already found and fixed on
// appointments/index.jsx/calendar/index.jsx.

const resultRow = {
  __typename: 'TestResult', id: 'TR-100', patient: 'Anita Sharma', test: 'CBC', ordered_by: 'Dr. Sarah Mitchell',
  date_ordered: '2026-08-20', date_completed: null, status: 'pending', type: 'Blood Test', values: [],
}

function paginatedMock(data, { total = data.length, hasMorePages = false } = {}) {
  return {
    request: { query: TEST_RESULTS_QUERY, variables: { search: undefined, type: undefined, status: undefined, first: undefined, page: undefined } },
    result: {
      data: {
        testResults: {
          __typename: 'TestResultPaginated',
          data,
          paginatorInfo: { __typename: 'TestResultPaginatorInfo', count: data.length, currentPage: 1, hasMorePages, lastPage: hasMorePages ? 2 : 1, perPage: 200, total },
        },
      },
    },
  }
}

function renderPage(mocks) {
  return render(
    <HelmetProvider>
      <SnackbarProvider>
        <MockedProvider mocks={mocks} addTypename={false}>
          <MemoryRouter>
            <TestResults />
          </MemoryRouter>
        </MockedProvider>
      </SnackbarProvider>
    </HelmetProvider>,
  )
}

describe('test-results/index (REQ133)', () => {
  it('renders real results from the paginated {data, paginatorInfo} shape', async () => {
    renderPage([paginatedMock([resultRow])])
    await waitFor(() => expect(screen.getByText('Anita Sharma')).toBeInTheDocument())
    expect(screen.getByText('CBC')).toBeInTheDocument()
  })

  it('does NOT fall back to fabricated mock data on a real, genuine empty result', async () => {
    renderPage([paginatedMock([])])
    await waitFor(() => expect(screen.getByText('0 total results · 0 pending')).toBeInTheDocument())
    // MOCK_RESULTS' own first fixture patient — must never appear for a real empty result.
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
  })

  it('falls back to mock data only on a genuine query error', async () => {
    renderPage([{ request: { query: TEST_RESULTS_QUERY, variables: { search: undefined, type: undefined, status: undefined, first: undefined, page: undefined } }, error: new Error('Network error') }])
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument())
  })

  it('shows an honest "showing N of Total" note when the bounded fetch has more pages', async () => {
    renderPage([paginatedMock([resultRow], { total: 250, hasMorePages: true })])
    await waitFor(() => expect(screen.getByText(/showing the 1 most recent of 250/)).toBeInTheDocument())
  })

  it('shows no truncation note when everything fit in one page', async () => {
    renderPage([paginatedMock([resultRow], { total: 1, hasMorePages: false })])
    await waitFor(() => expect(screen.getByText('Anita Sharma')).toBeInTheDocument())
    expect(screen.queryByText(/showing the/)).not.toBeInTheDocument()
  })

  // P2-13 — the previously-missing completion path: before this slice, no
  // mutation anywhere could ever move a test result out of 'pending'.
  describe('recordTestResult (P2-13)', () => {
    it('offers a "Record Result" action for a pending result, not for a completed one', async () => {
      const completedRow = { ...resultRow, id: 'TR-101', status: 'completed', date_completed: '2026-08-21' }
      renderPage([paginatedMock([resultRow, completedRow])])
      await waitFor(() => expect(screen.getAllByText('Anita Sharma')).toHaveLength(2))
      expect(screen.getAllByLabelText('Record Result')).toHaveLength(1)
    })

    it('completes a result and refetches the list', async () => {
      const user = userEvent.setup()
      const completedRow = { ...resultRow, status: 'completed', date_completed: '2026-08-21', values: [{ __typename: 'TestResultValue', name: 'Hb', value: '14', ref: '13-17', flag: 'normal' }] }
      const recordMock = {
        request: {
          query: RECORD_TEST_RESULT_MUTATION,
          variables: { input: { id: 'TR-100', status: 'completed', values: [{ name: 'Hb', value: '14', ref: '13-17', flag: 'normal' }] } },
        },
        result: { data: { recordTestResult: completedRow } },
      }
      renderPage([paginatedMock([resultRow]), recordMock, paginatedMock([completedRow])])
      await waitFor(() => expect(screen.getByText('Anita Sharma')).toBeInTheDocument())

      await user.click(screen.getByLabelText('Record Result'))
      await waitFor(() => expect(screen.getByText(/Record Result — CBC/)).toBeInTheDocument())

      await user.type(screen.getByLabelText('Parameter'), 'Hb')
      await user.type(screen.getByLabelText('Value'), '14')
      await user.type(screen.getByLabelText('Reference'), '13-17')
      await user.click(screen.getByRole('button', { name: /complete result/i }))

      await waitFor(() => expect(screen.getByText('Result saved.')).toBeInTheDocument())
    })
  })
})
