import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing'
import { ThemeProvider } from '@mui/material/styles'
import { gql } from '@apollo/client'
import ManagerRegistries from './index'
import { createAppTheme } from '../../../theme'

// REQ168 (P2-12) -- chronic-disease registries. Two parallel client.query()
// calls on mount/tab-change (registryEnrollments, chronicRegistrySuggestions
// for the default 'diabetes' condition), matching
// manager/memberships/index.test.jsx's own established withProviders pattern.

const GET_REGISTRY_ENROLLMENTS = gql`
  query GetRegistryEnrollments($condition: String) {
    registryEnrollments(condition: $condition) {
      id
      patient_id
      patient_name
      condition
      status
      enrolled_at
      enrolled_by_name
      last_reviewed_at
      notes
      recall_status
    }
  }
`
const GET_CHRONIC_REGISTRY_SUGGESTIONS = gql`
  query GetChronicRegistrySuggestions($condition: String!) {
    chronicRegistrySuggestions(condition: $condition) {
      patient_id
      patient_name
      matched_icd10_code
      matched_diagnosis_text
    }
  }
`
const ENROLL_IN_REGISTRY = gql`
  mutation EnrollInRegistry($input: EnrollInRegistryInput!) {
    enrollInRegistry(input: $input) {
      id
    }
  }
`
const MARK_REGISTRY_REVIEWED = gql`
  mutation MarkRegistryReviewed($input: MarkRegistryReviewedInput!) {
    markRegistryReviewed(input: $input) {
      id
    }
  }
`

function withProviders(mocks, children) {
  return (
    <ThemeProvider theme={createAppTheme('light')}>
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    </ThemeProvider>
  )
}

const emptyMocks = [
  { request: { query: GET_REGISTRY_ENROLLMENTS, variables: { condition: 'diabetes' } }, result: { data: { registryEnrollments: [] } } },
  { request: { query: GET_CHRONIC_REGISTRY_SUGGESTIONS, variables: { condition: 'diabetes' } }, result: { data: { chronicRegistrySuggestions: [] } } },
]

describe('ManagerRegistries (chronic-disease registries)', () => {
  it('shows real empty states when there are no enrollments or suggestions yet', async () => {
    render(withProviders(emptyMocks, <ManagerRegistries />))
    await waitFor(() => expect(screen.getByText('No patients enrolled in this registry yet.')).toBeInTheDocument())
    expect(screen.getByText('No new candidates found.')).toBeInTheDocument()
  })

  it('lists an enrolled patient with their real recall status', async () => {
    const mocks = [
      {
        request: { query: GET_REGISTRY_ENROLLMENTS, variables: { condition: 'diabetes' } },
        result: {
          data: {
            registryEnrollments: [
              {
                id: 'enr-1', patient_id: 'pat-1', patient_name: 'Anita Sharma', condition: 'diabetes', status: 'active',
                enrolled_at: '2026-01-01T00:00:00.000Z', enrolled_by_name: 'Dr. Alex', last_reviewed_at: '2026-01-01T00:00:00.000Z',
                notes: null, recall_status: 'overdue',
              },
            ],
          },
        },
      },
      { request: { query: GET_CHRONIC_REGISTRY_SUGGESTIONS, variables: { condition: 'diabetes' } }, result: { data: { chronicRegistrySuggestions: [] } } },
    ]
    render(withProviders(mocks, <ManagerRegistries />))
    await waitFor(() => expect(screen.getByText('Anita Sharma')).toBeInTheDocument())
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })

  it('lists a suggested candidate with the matched diagnosis and enrolls them via the real mutation', async () => {
    const mocks = [
      ...emptyMocks.slice(0, 1),
      {
        request: { query: GET_CHRONIC_REGISTRY_SUGGESTIONS, variables: { condition: 'diabetes' } },
        result: { data: { chronicRegistrySuggestions: [{ patient_id: 'pat-2', patient_name: 'Ravi Kumar', matched_icd10_code: 'E11.9', matched_diagnosis_text: 'Type 2 Diabetes' }] } },
      },
      {
        request: { query: ENROLL_IN_REGISTRY, variables: { input: { patient_id: 'pat-2', condition: 'diabetes' } } },
        result: { data: { enrollInRegistry: { id: 'enr-new' } } },
      },
      { request: { query: GET_REGISTRY_ENROLLMENTS, variables: { condition: 'diabetes' } }, result: { data: { registryEnrollments: [] } } },
      { request: { query: GET_CHRONIC_REGISTRY_SUGGESTIONS, variables: { condition: 'diabetes' } }, result: { data: { chronicRegistrySuggestions: [] } } },
    ]
    render(withProviders(mocks, <ManagerRegistries />))
    await waitFor(() => expect(screen.getByText('Ravi Kumar')).toBeInTheDocument())
    expect(screen.getByText('E11.9')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Enroll/ }))
    await waitFor(() => expect(screen.getByText('Patient enrolled in registry.')).toBeInTheDocument())
  })

  it('marks a review done via the real mutation and refetches', async () => {
    const enrollmentMock = {
      request: { query: GET_REGISTRY_ENROLLMENTS, variables: { condition: 'diabetes' } },
      result: {
        data: {
          registryEnrollments: [
            {
              id: 'enr-1', patient_id: 'pat-1', patient_name: 'Anita Sharma', condition: 'diabetes', status: 'active',
              enrolled_at: '2026-01-01T00:00:00.000Z', enrolled_by_name: 'Dr. Alex', last_reviewed_at: '2026-01-01T00:00:00.000Z',
              notes: null, recall_status: 'overdue',
            },
          ],
        },
      },
    }
    const mocks = [
      enrollmentMock,
      { request: { query: GET_CHRONIC_REGISTRY_SUGGESTIONS, variables: { condition: 'diabetes' } }, result: { data: { chronicRegistrySuggestions: [] } } },
      { request: { query: MARK_REGISTRY_REVIEWED, variables: { input: { enrollment_id: 'enr-1' } } }, result: { data: { markRegistryReviewed: { id: 'enr-1' } } } },
      enrollmentMock,
      { request: { query: GET_CHRONIC_REGISTRY_SUGGESTIONS, variables: { condition: 'diabetes' } }, result: { data: { chronicRegistrySuggestions: [] } } },
    ]
    render(withProviders(mocks, <ManagerRegistries />))
    await waitFor(() => expect(screen.getByText('Anita Sharma')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Mark Reviewed' }))
    await waitFor(() => expect(screen.getByText('Review recorded.')).toBeInTheDocument())
  })
})
