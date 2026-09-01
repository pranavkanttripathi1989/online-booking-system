import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import AdminPlatformBilling from './PlatformBilling'

// REQ178/179/180 — first real coverage for this page: create-subscription
// happy path (including the mandate-setup-link result state), the SURF-16
// typed-confirmation cancel flow (wrong name stays disabled, right name
// submits), and a failed-invoice retry. Not full regression coverage of
// every filter/tab combination — matches this codebase's own established
// bar for a first test file on a new admin page (see Departments.test.jsx,
// Organizations.test.jsx).

const SUBSCRIPTION_FIELDS = `
  id
  client_org { id name }
  plan { id name tier }
  billing_period
  price
  status
  gateway
  mandate_status
  authentication_url
  current_period_start
  current_period_end
  cancel_at_period_end
  cancelled_at
  cancellation_reason
  created_at
`
const INVOICE_FIELDS = `
  id
  subscription_id
  client_org { id name }
  invoice_number
  amount
  status
  due_date
  paid_at
  gateway
  pre_debit_notice_sent_at
  afa_required
  platform_gstin
  client_org_gstin
  hsn_sac_code
  gst_rate
  cgst_amount
  sgst_amount
  igst_amount
  created_at
`

const GET_SUBSCRIPTIONS = gql`
  query GetPlatformSubscriptions($status: String) {
    platformSubscriptions(status: $status) {
      ${SUBSCRIPTION_FIELDS}
    }
  }
`
const GET_INVOICES = gql`
  query GetPlatformInvoices($status: String) {
    platformInvoices(status: $status) {
      ${INVOICE_FIELDS}
    }
  }
`
const GET_TRANSACTIONS = gql`
  query GetPlatformTransactions($status: String) {
    platformTransactions(status: $status) {
      ${INVOICE_FIELDS}
    }
  }
`
const GET_PROVIDERS = gql`
  query GetPlatformBillingProviders {
    platformBillingProviders {
      id
      label
    }
  }
`
const GET_PLANS_FOR_SUBSCRIBE = gql`
  query GetPlansForPlatformSubscribe {
    plans {
      id
      name
      tier
      is_active
      current_version {
        id
        price
        billing_period
      }
    }
  }
`
const SEARCH_ORGS = gql`
  query SearchOrgsForPlatformBilling($search: OrganizationSearchInput) {
    organizationsPaginated(search: $search) {
      data {
        id
        name
        code
      }
    }
  }
`
const CREATE_SUBSCRIPTION = gql`
  mutation CreatePlatformSubscription($input: CreatePlatformSubscriptionInput!) {
    createPlatformSubscription(input: $input) {
      success
      message
      subscription {
        ${SUBSCRIPTION_FIELDS}
      }
    }
  }
`
const CANCEL_SUBSCRIPTION = gql`
  mutation CancelPlatformSubscription($input: CancelPlatformSubscriptionInput!) {
    cancelPlatformSubscription(input: $input) {
      success
      message
    }
  }
`
const RETRY_INVOICE = gql`
  mutation RetryPlatformInvoice($invoiceId: ID!) {
    retryPlatformInvoice(invoice_id: $invoiceId) {
      success
      message
    }
  }
`

const activeSub = {
  __typename: 'PlatformSubscription',
  id: 'sub-1',
  client_org: { __typename: 'PlatformSubscriptionOrg', id: 'org-1', name: 'City Care Clinic' },
  plan: { __typename: 'PlatformSubscriptionPlan', id: 'plan-1', name: 'Pro', tier: 'pro' },
  billing_period: 'monthly',
  price: 5000,
  status: 'active',
  gateway: 'razorpay',
  mandate_status: 'confirmed',
  authentication_url: null,
  current_period_start: '2026-08-01T00:00:00.000Z',
  current_period_end: '2026-09-01T00:00:00.000Z',
  cancel_at_period_end: false,
  cancelled_at: null,
  cancellation_reason: null,
  created_at: '2026-08-01T00:00:00.000Z',
}

const failedInvoice = {
  __typename: 'PlatformInvoice',
  id: 'inv-1',
  subscription_id: 'sub-1',
  client_org: { __typename: 'PlatformSubscriptionOrg', id: 'org-1', name: 'City Care Clinic' },
  invoice_number: 'PLAT-INV/2026-27/00001',
  amount: 5000,
  status: 'failed',
  due_date: '2026-09-01T00:00:00.000Z',
  paid_at: null,
  gateway: 'razorpay',
  pre_debit_notice_sent_at: null,
  afa_required: false,
  platform_gstin: null,
  client_org_gstin: null,
  hsn_sac_code: null,
  gst_rate: null,
  cgst_amount: null,
  sgst_amount: null,
  igst_amount: null,
  created_at: '2026-08-25T00:00:00.000Z',
}

function baseMocks({ subscriptions = [], invoices = [], transactions = [] } = {}) {
  return [
    { request: { query: GET_SUBSCRIPTIONS, variables: { status: undefined } }, result: { data: { platformSubscriptions: subscriptions } } },
    { request: { query: GET_INVOICES, variables: { status: undefined } }, result: { data: { platformInvoices: invoices } } },
    { request: { query: GET_TRANSACTIONS, variables: { status: undefined } }, result: { data: { platformTransactions: transactions } } },
  ]
}

function renderPage(mocks) {
  return render(
    <MockedProvider mocks={mocks} addTypename={true}>
      <AdminPlatformBilling />
    </MockedProvider>,
  )
}

describe('admin/PlatformBilling', () => {
  it('renders the empty state when no subscriptions exist yet', async () => {
    renderPage(baseMocks())
    await waitFor(() => expect(screen.getByText('No subscriptions yet')).toBeInTheDocument())
  })

  it('lists real subscriptions from the backend, not mock data', async () => {
    renderPage(baseMocks({ subscriptions: [activeSub] }))
    await waitFor(() => expect(screen.getByText('City Care Clinic')).toBeInTheDocument())
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText(/Subscriptions \(1\)/)).toBeInTheDocument()
  })

  it('creates a subscription and shows the mandate setup link when the gateway returns one', async () => {
    // Real 300ms debounce + userEvent's own per-keystroke timing + two
    // network round trips can exceed Jest's 5000ms default under
    // multi-suite resource contention (observed running alongside
    // Organizations.test.jsx) — extend rather than fake the timers, to
    // keep exercising the real debounce path.
    const createMocks = [
      ...baseMocks(),
      { request: { query: GET_PROVIDERS }, result: { data: { platformBillingProviders: [{ __typename: 'PlatformBillingProviderOption', id: 'razorpay', label: 'Razorpay (UPI AutoPay / eNACH)' }] } } },
      {
        request: { query: GET_PLANS_FOR_SUBSCRIBE },
        result: {
          data: {
            plans: [
              {
                __typename: 'Plan',
                id: 'plan-1',
                name: 'Pro',
                tier: 'pro',
                is_active: true,
                current_version: { __typename: 'PlanVersion', id: 'pv-1', price: 5000, billing_period: 'monthly' },
              },
            ],
          },
        },
      },
      {
        request: { query: SEARCH_ORGS, variables: { search: { search: 'City', limit: 20, offset: 0 } } },
        result: { data: { organizationsPaginated: { data: [{ __typename: 'Organization', id: 'org-1', name: 'City Care Clinic', code: 'citycare' }] } } },
      },
      {
        request: {
          query: CREATE_SUBSCRIPTION,
          variables: { input: { client_org_id: 'org-1', plan_id: 'plan-1', gateway: 'razorpay' } },
        },
        result: {
          data: {
            createPlatformSubscription: {
              success: true,
              message: null,
              subscription: { ...activeSub, id: 'sub-2', status: 'trialing', authentication_url: 'https://rzp.io/i/setup123' },
            },
          },
        },
      },
      ...baseMocks({ subscriptions: [activeSub] }), // refetch after create
    ]
    renderPage(createMocks)
    await waitFor(() => expect(screen.getByText('No subscriptions yet')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /new subscription/i }))
    const dialog = await screen.findByRole('dialog')
    // FORM-2/required fields render an asterisk appended to the label's
    // own textContent ("Plan *"), so an exact-string match fails — every
    // lookup here is a case-insensitive substring match instead.
    await within(dialog).findByLabelText(/^plan/i)

    // MUI Autocomplete only opens its popup on a real focus+type sequence
    // (fireEvent.change alone never triggers onInputChange), and it
    // renders the option list in a Popper portal outside the Dialog's own
    // DOM subtree — so this drives it with userEvent and queries via the
    // global screen, not within(dialog).
    // delay: null fires every keystroke in the same tick, so only the
    // final "City" search's 300ms debounce timer survives — with a real
    // per-key delay, a slower CI run can let an earlier prefix (e.g.
    // "Ci") debounce and fire before typing finishes.
    await userEvent.type(within(dialog).getByLabelText(/tenant organization/i), 'City', { delay: null })
    const orgOption = await screen.findByText('City Care Clinic (citycare)', {}, { timeout: 3000 })
    fireEvent.click(orgOption)

    fireEvent.mouseDown(within(dialog).getByLabelText(/^plan/i))
    fireEvent.click(await screen.findByRole('option', { name: /Pro/ }))

    fireEvent.mouseDown(within(dialog).getByLabelText(/payment gateway/i))
    fireEvent.click(await screen.findByRole('option', { name: /Razorpay/ }))

    fireEvent.click(within(dialog).getByRole('button', { name: /create subscription/i }))

    await waitFor(() => expect(within(dialog).getByDisplayValue('https://rzp.io/i/setup123')).toBeInTheDocument())
  }, 15000)

  it('requires typing the exact tenant name before Confirm Cancellation is enabled', async () => {
    renderPage(baseMocks({ subscriptions: [activeSub] }))
    await waitFor(() => expect(screen.getByText('City Care Clinic')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /view/i }))
    const detailDialog = await screen.findByRole('dialog')
    fireEvent.click(within(detailDialog).getByRole('button', { name: /cancel subscription/i }))

    const cancelDialog = await screen.findByRole('dialog', { name: /cancel subscription/i })
    const confirmButton = within(cancelDialog).getByRole('button', { name: /confirm cancellation/i })
    expect(confirmButton).toBeDisabled()

    fireEvent.change(within(cancelDialog).getByLabelText(/reason/i), { target: { value: 'Non-payment' } })
    fireEvent.change(within(cancelDialog).getByLabelText(/type "city care clinic" to confirm/i), { target: { value: 'wrong name' } })
    expect(confirmButton).toBeDisabled()

    fireEvent.change(within(cancelDialog).getByLabelText(/type "city care clinic" to confirm/i), { target: { value: 'City Care Clinic' } })
    expect(confirmButton).not.toBeDisabled()
  })

  it('submits a graceful cancel with the typed org name and reason', async () => {
    const mocks = [
      ...baseMocks({ subscriptions: [activeSub] }),
      {
        request: { query: CANCEL_SUBSCRIPTION, variables: { input: { subscription_id: 'sub-1', reason: 'Non-payment', immediately: false } } },
        result: { data: { cancelPlatformSubscription: { success: true, message: null } } },
      },
      ...baseMocks({ subscriptions: [{ ...activeSub, cancel_at_period_end: true, cancellation_reason: 'Non-payment' }] }),
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByText('City Care Clinic')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /view/i }))
    const detailDialog = await screen.findByRole('dialog')
    fireEvent.click(within(detailDialog).getByRole('button', { name: /cancel subscription/i }))

    const cancelDialog = await screen.findByRole('dialog', { name: /cancel subscription/i })
    fireEvent.change(within(cancelDialog).getByLabelText(/reason/i), { target: { value: 'Non-payment' } })
    fireEvent.change(within(cancelDialog).getByLabelText(/type "city care clinic" to confirm/i), { target: { value: 'City Care Clinic' } })
    fireEvent.click(within(cancelDialog).getByRole('button', { name: /confirm cancellation/i }))

    await waitFor(() => expect(screen.getByText(/will cancel at the end of the current period/i)).toBeInTheDocument())
  })

  it('records a manual retry on a failed invoice', async () => {
    const mocks = [
      { request: { query: GET_SUBSCRIPTIONS, variables: { status: undefined } }, result: { data: { platformSubscriptions: [] } } },
      { request: { query: GET_INVOICES, variables: { status: undefined } }, result: { data: { platformInvoices: [failedInvoice] } } },
      { request: { query: GET_TRANSACTIONS, variables: { status: undefined } }, result: { data: { platformTransactions: [] } } },
      { request: { query: RETRY_INVOICE, variables: { invoiceId: 'inv-1' } }, result: { data: { retryPlatformInvoice: { success: true, message: null } } } },
      { request: { query: GET_INVOICES, variables: { status: undefined } }, result: { data: { platformInvoices: [{ ...failedInvoice, status: 'failed' }] } } },
      { request: { query: GET_TRANSACTIONS, variables: { status: undefined } }, result: { data: { platformTransactions: [] } } },
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByText('No subscriptions yet')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: /invoices/i }))
    await screen.findByText('PLAT-INV/2026-27/00001')
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => expect(screen.getByText(/retry recorded/i)).toBeInTheDocument())
  }, 10000)
})
