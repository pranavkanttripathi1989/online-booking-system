import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import AdminOrganizations from './Organizations'

// P1-04 — focused coverage for the entitlement-plan assignment dialog this
// slice added. Not full-page regression coverage (no test file existed for
// this page before this slice; that remains a pre-existing gap, not one
// this slice's own scope covers).

const GET_ORGS = gql`
  query GetOrganizations($search: OrganizationSearchInput) {
    organizationsPaginated(search: $search) {
      data {
        id
        name
        code
        contactEmail
        contactPhone
        is_active
        plan_id
        plan_name
        address {
          line1
          line2
          city
          state
          pincode
          country
        }
      }
      pageInfo {
        total
        limit
        offset
        hasNextPage
        hasPreviousPage
      }
    }
  }
`
const GET_PLANS_FOR_ASSIGNMENT = gql`
  query GetPlansForAssignment {
    plans {
      id
      name
      tier
      is_active
    }
  }
`
const ASSIGN_ORG_PLAN = gql`
  mutation AssignOrgPlan($orgId: ID!, $planId: ID) {
    assignOrgPlan(orgId: $orgId, planId: $planId) {
      success
      userErrors {
        message
      }
      organization {
        id
        plan_id
        plan_name
      }
    }
  }
`

const org1 = {
  __typename: 'Organization',
  id: 'org-1',
  name: 'City Care Clinic',
  code: 'citycare',
  contactEmail: 'admin@citycare.dev',
  contactPhone: null,
  is_active: true,
  plan_id: null,
  plan_name: null,
  address: null,
}

const orgsMock = (orgs = [org1]) => ({
  request: { query: GET_ORGS, variables: { search: { search: '', limit: 50, offset: 0 } } },
  result: { data: { organizationsPaginated: { data: orgs, pageInfo: { total: orgs.length, limit: 50, offset: 0, hasNextPage: false, hasPreviousPage: false } } } },
})

const plansMock = (plans) => ({ request: { query: GET_PLANS_FOR_ASSIGNMENT }, result: { data: { plans } } })

const proPlan = { __typename: 'Plan', id: 'plan-pro', name: 'Pro', tier: 'pro', is_active: true }
const inactivePlan = { __typename: 'Plan', id: 'plan-old', name: 'Legacy', tier: 'starter', is_active: false }

function renderPage(mocks) {
  return render(
    <MemoryRouter>
      <MockedProvider mocks={mocks} addTypename={false}>
        <AdminOrganizations />
      </MockedProvider>
    </MemoryRouter>,
  )
}

describe('admin/Organizations — entitlement plan assignment (P1-04)', () => {
  it('opens the plan dialog and lists the real plan catalog', async () => {
    renderPage([orgsMock(), plansMock([proPlan, inactivePlan])])
    await waitFor(() => expect(screen.getByText('City Care Clinic')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Assign an entitlement plan/ }))

    await waitFor(() => expect(screen.getByText('Entitlement Plan — City Care Clinic')).toBeInTheDocument())
    fireEvent.mouseDown(await screen.findByLabelText('Entitlement Plan'))
    const listbox = screen.getByRole('listbox')
    expect(within(listbox).getByText('None — unrestricted')).toBeInTheDocument()
    expect(within(listbox).getByText(/Pro \(pro\)/)).toBeInTheDocument()
    expect(within(listbox).getByText(/Legacy \(starter\) — inactive/)).toBeInTheDocument()
  })

  it('disables selecting an inactive plan', async () => {
    renderPage([orgsMock(), plansMock([proPlan, inactivePlan])])
    await waitFor(() => expect(screen.getByText('City Care Clinic')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Assign an entitlement plan/ }))
    fireEvent.mouseDown(await screen.findByLabelText('Entitlement Plan'))
    const option = within(screen.getByRole('listbox')).getByText(/Legacy/).closest('li')
    expect(option).toHaveAttribute('aria-disabled', 'true')
  })

  it('assigns a plan via the real mutation and refreshes the org list', async () => {
    const mocks = [
      orgsMock(),
      plansMock([proPlan]),
      {
        request: { query: ASSIGN_ORG_PLAN, variables: { orgId: 'org-1', planId: 'plan-pro' } },
        result: { data: { assignOrgPlan: { success: true, userErrors: [], organization: { id: 'org-1', plan_id: 'plan-pro', plan_name: 'Pro' } } } },
      },
      orgsMock([{ ...org1, plan_id: 'plan-pro', plan_name: 'Pro' }]),
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByText('City Care Clinic')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Assign an entitlement plan/ }))
    fireEvent.mouseDown(await screen.findByLabelText('Entitlement Plan'))
    fireEvent.click(within(screen.getByRole('listbox')).getByText(/Pro \(pro\)/))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByText('Plan updated.')).toBeInTheDocument())
  })

  it('clearing back to "None — unrestricted" sends planId: null', async () => {
    const gatedOrg = { ...org1, plan_id: 'plan-pro', plan_name: 'Pro' }
    const mocks = [
      orgsMock([gatedOrg]),
      plansMock([proPlan]),
      {
        request: { query: ASSIGN_ORG_PLAN, variables: { orgId: 'org-1', planId: null } },
        result: { data: { assignOrgPlan: { success: true, userErrors: [], organization: { id: 'org-1', plan_id: null, plan_name: null } } } },
      },
      orgsMock([org1]),
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByText('City Care Clinic')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Change entitlement plan/ }))
    fireEvent.mouseDown(await screen.findByLabelText('Entitlement Plan'))
    fireEvent.click(within(screen.getByRole('listbox')).getByText('None — unrestricted'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByText('Plan updated.')).toBeInTheDocument())
  })

  it('surfaces a real userError from the mutation instead of a silent failure', async () => {
    const mocks = [
      orgsMock(),
      plansMock([proPlan]),
      {
        request: { query: ASSIGN_ORG_PLAN, variables: { orgId: 'org-1', planId: 'plan-pro' } },
        result: { data: { assignOrgPlan: { success: false, userErrors: [{ message: 'Plan not found' }], organization: null } } },
      },
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByText('City Care Clinic')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Assign an entitlement plan/ }))
    fireEvent.mouseDown(await screen.findByLabelText('Entitlement Plan'))
    fireEvent.click(within(screen.getByRole('listbox')).getByText(/Pro \(pro\)/))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByText('Plan not found')).toBeInTheDocument())
  })
})
