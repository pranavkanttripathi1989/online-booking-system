import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { gql } from '@apollo/client'
import SettingsPage from './index'
import { useAuth } from '../../context/AuthContext'

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}))

// A-8 (project-plans/08-integration-gap-analysis.md) — re-declared to match
// settings/index.jsx's own gql documents exactly (query AST equality).
const MY_PROFILE_QUERY = gql`
  query MyProfile {
    myProfile {
      id first_name last_name email phone bio date_of_birth gender avatar_url totp_enabled
      address { line1 line2 city state pincode country }
    }
  }
`
const MY_SESSIONS_QUERY = gql`query MySessions { mySessions { id device created_at } }`
const MY_BREAK_GLASS_GRANTS_QUERY = gql`query MyBreakGlassGrants { myBreakGlassGrants { id reason granted_at expires_at revoked_at is_active } }`
const MY_NOTIFICATION_PREFERENCES_QUERY = gql`query MyNotificationPreferences { myNotificationPreferences { event_type email_enabled sms_enabled app_enabled whatsapp_enabled quiet_hours_start quiet_hours_end } }`
const GET_ORG_BRANDING = gql`query MyOrgBranding { myOrgBranding { name logo_url primary_color secondary_color } }`
const GET_INTEGRATIONS = gql`
  query GetIntegrations {
    bookingWidgetConfigs { id allowed_origins short_link_slug is_active }
    webhookEndpoints { id url event_types is_active }
    apiKeys { id key_prefix name is_active last_used_at }
  }
`
const GET_WEBHOOK_DELIVERY_LOG = gql`
  query GetWebhookDeliveryLog($endpoint_id: ID!) {
    webhookDeliveryLog(endpoint_id: $endpoint_id) {
      id event_type status http_status attempted_at response_snippet
    }
  }
`
const GET_MY_PATIENT_LINK = gql`query MyPatientLink { me { patient { id } } }`
const UPDATE_BOOKING_WIDGET = gql`
  mutation UpdateBookingWidgetConfig($id: ID!, $input: BookingWidgetConfigInput!) {
    updateBookingWidgetConfig(id: $id, input: $input) { success userErrors { message } config { id allowed_origins short_link_slug } }
  }
`

const WEBHOOK_ID = 'wh-1'
const WIDGET_ID = 'widget-1'

function baseMocks({ widgetConfigs = [] } = {}) {
  return [
    { request: { query: MY_PROFILE_QUERY }, result: { data: { myProfile: null } } },
    { request: { query: MY_SESSIONS_QUERY }, result: { data: { mySessions: [] } } },
    { request: { query: MY_NOTIFICATION_PREFERENCES_QUERY }, result: { data: { myNotificationPreferences: [] } } },
    { request: { query: MY_BREAK_GLASS_GRANTS_QUERY }, result: { data: { myBreakGlassGrants: [] } } },
    { request: { query: GET_ORG_BRANDING }, result: { data: { myOrgBranding: null } } },
    { request: { query: GET_MY_PATIENT_LINK }, result: { data: { me: { __typename: 'User', patient: null } } } },
    {
      request: { query: GET_INTEGRATIONS },
      result: { data: { bookingWidgetConfigs: widgetConfigs, webhookEndpoints: [{ __typename: 'WebhookEndpoint', id: WEBHOOK_ID, url: 'https://example.com/hook', event_types: ['appointment.created'], is_active: true }], apiKeys: [] } },
    },
  ]
}

function renderPage(mocks) {
  useAuth.mockReturnValue({ user: { id: 'u-1', name: 'Sarah', email: 'sarah@medibook.dev', roles: [{ name: 'admin' }] }, updateUser: jest.fn(), logout: jest.fn(), hasRole: () => true })
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[{ pathname: '/settings', state: { tab: 5 } }]}>
        <SnackbarProvider>
          <MockedProvider mocks={mocks}>
            <SettingsPage />
          </MockedProvider>
        </SnackbarProvider>
      </MemoryRouter>
    </HelmetProvider>
  )
}

describe('settings/index.jsx — webhook delivery log (A-8)', () => {
  it('shows a real empty state when a webhook has no deliveries yet', async () => {
    renderPage([
      ...baseMocks(),
      { request: { query: GET_WEBHOOK_DELIVERY_LOG, variables: { endpoint_id: WEBHOOK_ID } }, result: { data: { webhookDeliveryLog: [] } } },
    ])
    await waitFor(() => expect(screen.getByText('https://example.com/hook')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Delivery Log' }))
    await waitFor(() => expect(screen.getByText('No deliveries recorded yet.')).toBeInTheDocument())
  })

  it('renders real delivery attempts, including a failed one', async () => {
    renderPage([
      ...baseMocks(),
      {
        request: { query: GET_WEBHOOK_DELIVERY_LOG, variables: { endpoint_id: WEBHOOK_ID } },
        result: { data: { webhookDeliveryLog: [
          { __typename: 'WebhookDeliveryLogEntry', id: 'log-1', event_type: 'appointment.created', status: 'failed', http_status: null, attempted_at: '2026-08-25T09:00:00.000Z', response_snippet: 'ECONNREFUSED' },
        ] } },
      },
    ])
    await waitFor(() => expect(screen.getByText('https://example.com/hook')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Delivery Log' }))

    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(within(dialog).getByText('appointment.created')).toBeInTheDocument())
    expect(within(dialog).getByText('failed')).toBeInTheDocument()
  })
})

describe('settings/index.jsx — booking widget edit (A-9)', () => {
  it('edits an existing widget\'s allowed origins via the real updateBookingWidgetConfig mutation, without a new slug', async () => {
    const widget = { __typename: 'BookingWidgetConfig', id: WIDGET_ID, allowed_origins: ['https://old-clinic.com'], short_link_slug: 'abc123', is_active: true }
    renderPage([
      ...baseMocks({ widgetConfigs: [widget] }),
      {
        request: { query: UPDATE_BOOKING_WIDGET, variables: { id: WIDGET_ID, input: { allowed_origins: ['https://new-clinic.com'] } } },
        result: { data: { updateBookingWidgetConfig: { success: true, userErrors: [], config: { __typename: 'BookingWidgetConfig', id: WIDGET_ID, allowed_origins: ['https://new-clinic.com'], short_link_slug: 'abc123' } } } },
      },
      { request: { query: GET_INTEGRATIONS }, result: { data: { bookingWidgetConfigs: [{ ...widget, allowed_origins: ['https://new-clinic.com'] }], webhookEndpoints: [], apiKeys: [] } } },
    ])

    await waitFor(() => expect(screen.getByText('https://old-clinic.com')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

    const dialog = await screen.findByRole('dialog')
    const originsField = within(dialog).getByLabelText(/^Allowed origin/)
    await userEvent.clear(originsField)
    await userEvent.type(originsField, 'https://new-clinic.com')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByText('https://new-clinic.com')).toBeInTheDocument())
    expect(screen.getByText('abc123')).toBeInTheDocument()
  }, 20000)
})
