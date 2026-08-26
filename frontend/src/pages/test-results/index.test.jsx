import { render, screen, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import TestResults from './index'
import { TEST_RESULTS_QUERY } from '../../graphql/queries'

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
      <MockedProvider mocks={mocks} addTypename={false}>
        <MemoryRouter>
          <TestResults />
        </MemoryRouter>
      </MockedProvider>
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
})
