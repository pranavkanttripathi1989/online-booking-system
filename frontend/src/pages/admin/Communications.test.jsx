import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import AdminCommunications from './Communications'
import { expectNoA11yViolations } from '../../test/a11y'

// P1-01/REQ144 — WhatsApp conversation spend card on the Global Settings tab.
// Re-declared to match Communications.jsx's own gql documents exactly (query
// AST equality is how MockedProvider matches, not import identity — same
// convention as clinician/Dashboard.test.jsx).

const GET_EMAIL_TEMPLATES = gql`
  query GetNotificationEmailTemplates {
    emailTemplates {
      id
      name
      type
      subject
      body
      variables
      is_active
    }
  }
`
const GET_COMMUNICATION_SETTINGS = gql`
  query GetOrgCommunicationSettings {
    myOrgCommunicationSettings {
      email_from_name
      email_from_address
      email_reply_to
      email_include_branding
      whatsapp_monthly_cap_rupees
    }
  }
`
const UPDATE_COMMUNICATION_SETTINGS = gql`
  mutation UpdateOrgCommunicationSettings($input: UpdateOrgCommunicationSettingsInput!) {
    updateMyOrgCommunicationSettings(input: $input) {
      success
      userErrors {
        message
      }
    }
  }
`
const GET_NOTIFICATION_PROVIDERS = gql`
  query GetNotificationProviders {
    notificationProviders {
      id
      label
      channel
      fields {
        key
        label
        type
        required
      }
    }
  }
`
const GET_MY_NOTIFICATION_PROVIDER_CONFIG = gql`
  query GetMyNotificationProviderConfig($channel: String!) {
    myNotificationProviderConfig(channel: $channel) {
      channel
      provider
      sender_id
      has_credentials
    }
  }
`
const GET_WHATSAPP_SPEND = gql`
  query GetWhatsappConversationSpend {
    whatsappConversationSpend {
      periodStart
      periodEnd
      totalCostRupees
      byCategory {
        category
        count
        costRupees
      }
    }
  }
`

const baseMocks = (overrides = {}) => [
  { request: { query: GET_EMAIL_TEMPLATES }, result: { data: { emailTemplates: [] } } },
  {
    request: { query: GET_COMMUNICATION_SETTINGS },
    result: {
      data: {
        myOrgCommunicationSettings: {
          email_from_name: 'HealthSync',
          email_from_address: null,
          email_reply_to: null,
          email_include_branding: true,
          whatsapp_monthly_cap_rupees: null,
          ...overrides.settings,
        },
      },
    },
  },
  { request: { query: GET_NOTIFICATION_PROVIDERS }, result: { data: { notificationProviders: [] } } },
  {
    request: { query: GET_MY_NOTIFICATION_PROVIDER_CONFIG, variables: { channel: 'sms' } },
    result: { data: { myNotificationProviderConfig: null } },
  },
  {
    request: { query: GET_WHATSAPP_SPEND },
    result: {
      data: {
        whatsappConversationSpend: {
          periodStart: '2026-08-01T00:00:00.000Z',
          periodEnd: '2026-09-01T00:00:00.000Z',
          totalCostRupees: 0,
          byCategory: [],
          ...overrides.spend,
        },
      },
    },
  },
]

function renderPage(mocks) {
  return render(
    <MemoryRouter>
      <MockedProvider mocks={mocks} addTypename={false}>
        <AdminCommunications />
      </MockedProvider>
    </MemoryRouter>,
  )
}

async function openGlobalSettingsTab() {
  const tab = await screen.findByRole('tab', { name: 'Global Settings' })
  fireEvent.click(tab)
}

describe('AdminCommunications — WhatsApp conversation spend (P1-01/REQ144)', () => {
  it('shows a no-spend-yet message when nothing billable has been sent this period', async () => {
    renderPage(baseMocks())
    await openGlobalSettingsTab()
    await waitFor(() => expect(screen.getByText(/No billable WhatsApp conversations yet this period/)).toBeInTheDocument())
  })

  it('renders the category breakdown and total cost from a real spend response', async () => {
    const mocks = baseMocks({
      spend: {
        totalCostRupees: 6.3262,
        byCategory: [
          { category: 'utility', count: 40, costRupees: 4.6 },
          { category: 'marketing', count: 2, costRupees: 1.7262 },
        ],
      },
    })
    renderPage(mocks)
    await openGlobalSettingsTab()

    await waitFor(() => expect(screen.getByText('utility')).toBeInTheDocument())
    expect(screen.getByText('marketing')).toBeInTheDocument()
    expect(screen.getByText('₹4.60')).toBeInTheDocument()
    expect(screen.getByText('₹1.73')).toBeInTheDocument()
    expect(screen.getByText('₹6.33')).toBeInTheDocument()
  })

  it('pre-fills the cap field from the saved org setting and shows remaining budget', async () => {
    const mocks = baseMocks({
      settings: { whatsapp_monthly_cap_rupees: 5000 },
      spend: { totalCostRupees: 100, byCategory: [{ category: 'utility', count: 20, costRupees: 100 }] },
    })
    renderPage(mocks)
    await openGlobalSettingsTab()

    const capField = await screen.findByLabelText('WhatsApp monthly spend cap in rupees')
    await waitFor(() => expect(capField).toHaveValue('5000'))
    expect(screen.getByText(/₹4900\.00 remaining/)).toBeInTheDocument()
  })

  it('flags an over-cap period in the error color instead of a negative remaining figure', async () => {
    const mocks = baseMocks({
      settings: { whatsapp_monthly_cap_rupees: 100 },
      spend: { totalCostRupees: 150, byCategory: [{ category: 'utility', count: 30, costRupees: 150 }] },
    })
    renderPage(mocks)
    await openGlobalSettingsTab()

    await waitFor(() => expect(screen.getByText(/₹50\.00 over cap/)).toBeInTheDocument())
  })

  it('saves a new cap, sending only the cap field so the email settings are left untouched', async () => {
    const saveMock = {
      request: { query: UPDATE_COMMUNICATION_SETTINGS, variables: { input: { whatsapp_monthly_cap_rupees: 2000 } } },
      result: { data: { updateMyOrgCommunicationSettings: { success: true, userErrors: [] } } },
    }
    renderPage([...baseMocks(), saveMock])
    await openGlobalSettingsTab()

    const capField = await screen.findByLabelText('WhatsApp monthly spend cap in rupees')
    fireEvent.change(capField, { target: { value: '2000' } })
    fireEvent.click(screen.getByRole('button', { name: /Save Cap/ }))

    await waitFor(() => expect(screen.getByText('WhatsApp spend cap saved.')).toBeInTheDocument())
  })

  it('rejects a negative cap client-side without ever calling the mutation', async () => {
    renderPage(baseMocks())
    await openGlobalSettingsTab()

    const capField = await screen.findByLabelText('WhatsApp monthly spend cap in rupees')
    fireEvent.change(capField, { target: { value: '-5' } })
    fireEvent.click(screen.getByRole('button', { name: /Save Cap/ }))

    await waitFor(() => expect(screen.getByText(/non-negative amount/)).toBeInTheDocument())
  })
})

// P1-03 (CI-7)
describe('AdminCommunications — accessibility', () => {
  it('has zero axe-core violations on the Global Settings tab (spend card + cap form)', async () => {
    const { container } = renderPage(baseMocks())
    await openGlobalSettingsTab()
    await screen.findByLabelText('WhatsApp monthly spend cap in rupees')
    await expectNoA11yViolations(container)
  })
})
