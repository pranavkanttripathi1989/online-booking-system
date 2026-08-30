import { render, screen, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import ManagerMemberships from './index'

// Patient Membership Plans -- smoke coverage for the real GraphQL-driven
// load path (two imperative client.query() calls on mount: clinics,
// membershipPlans), matching manager/packages/index.test.jsx's own
// established withProviders/MockedProvider pattern.

const GET_MEMBERSHIP_PLAN_CLINICS = gql`
  query GetMembershipPlanClinics {
    clinics {
      id
      name
    }
  }
`
const GET_MEMBERSHIP_PLANS = gql`
  query GetMembershipPlans {
    membershipPlans {
      id
      clinic_id
      name
      description
      price_monthly
      is_active
    }
  }
`

function withProviders(mocks, children) {
  return (
    <MockedProvider mocks={mocks} addTypename={false}>
      {children}
    </MockedProvider>
  )
}

const emptyMocks = [
  { request: { query: GET_MEMBERSHIP_PLAN_CLINICS }, result: { data: { clinics: [{ id: 'clinic-a', name: 'MG Road Clinic' }] } } },
  { request: { query: GET_MEMBERSHIP_PLANS }, result: { data: { membershipPlans: [] } } },
]

describe('ManagerMemberships (Patient Membership Plans)', () => {
  it('shows an empty state when the org has no membership plans yet', async () => {
    render(withProviders(emptyMocks, <ManagerMemberships />))
    await waitFor(() => expect(screen.getByText(/No membership plans yet/)).toBeInTheDocument())
  })

  it('lists an existing membership plan with its monthly price', async () => {
    const mocks = [
      { request: { query: GET_MEMBERSHIP_PLAN_CLINICS }, result: { data: { clinics: [{ id: 'clinic-a', name: 'MG Road Clinic' }] } } },
      {
        request: { query: GET_MEMBERSHIP_PLANS },
        result: {
          data: {
            membershipPlans: [
              { id: 'plan-1', clinic_id: 'clinic-a', name: 'Wellness Basic', description: null, price_monthly: 499, is_active: true },
            ],
          },
        },
      },
    ]
    render(withProviders(mocks, <ManagerMemberships />))
    await waitFor(() => expect(screen.getByText('Wellness Basic')).toBeInTheDocument())
    expect(screen.getByText('₹499.00/mo')).toBeInTheDocument()
  })

  it('opens the create-plan form', async () => {
    render(withProviders(emptyMocks, <ManagerMemberships />))
    await waitFor(() => expect(screen.getByText(/No membership plans yet/)).toBeInTheDocument())
    const addButtons = screen.getAllByRole('button', { name: /New Plan/i })
    expect(addButtons.length).toBeGreaterThan(0)
  })
})
