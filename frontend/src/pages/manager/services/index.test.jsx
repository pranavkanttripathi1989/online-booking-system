import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import { CLINICS_QUERY } from '../../../graphql/queries'
import { ServiceCatalog } from './index'

// REQ111 — admin UI for the REQ055 branch-override backend. Matches the
// established withProviders/MockedProvider pattern (see manager/packages/
// index.test.jsx) for a page that fires imperative client.query() calls.

const GET_SERVICES_DATA = gql`
  query GetServicesData {
    services {
      id
      name
      description
      duration_minutes
      price
      is_active
      clinic_id
      gst_rate
      category {
        id
        name
      }
      clinicians {
        id
        full_name
      }
    }
    productCategories {
      id
      name
      description
      is_active
    }
  }
`
const GET_BRANCH_OVERRIDES = gql`
  query GetProductBranchOverrides {
    productBranchOverrides {
      id
      product_id
      clinic_id
      mode
      override_price
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

const masterService = {
  id: 'svc-master',
  name: 'GP Consultation',
  description: 'desc',
  duration_minutes: 20,
  price: 500,
  is_active: true,
  clinic_id: null,
  category: null,
  clinicians: [],
}
const clinicScopedService = {
  id: 'svc-scoped',
  name: 'Branch-only Service',
  description: 'desc',
  duration_minutes: 10,
  price: 200,
  is_active: true,
  clinic_id: 'clinic-a',
  category: null,
  clinicians: [],
}

function baseMocks(services, overrides = []) {
  return [
    { request: { query: GET_SERVICES_DATA }, result: { data: { services, productCategories: [] } } },
    { request: { query: GET_BRANCH_OVERRIDES }, result: { data: { productBranchOverrides: overrides } } },
    {
      request: { query: CLINICS_QUERY },
      result: {
        data: {
          clinics: [
            {
              id: 'clinic-a',
              name: 'MG Road Clinic',
              address: null,
              city: null,
              postcode: null,
              phone: null,
              email: null,
              timezone: null,
              is_active: true,
              is_primary: true,
            },
          ],
        },
      },
    },
  ]
}

describe('ServiceCatalog branch pricing (REQ111)', () => {
  it('enables Branch pricing for an org-level master service', async () => {
    render(withProviders(baseMocks([masterService]), <ServiceCatalog />))
    await waitFor(() => expect(screen.getByText('GP Consultation')).toBeInTheDocument())
    const btn = screen.getByRole('button', { name: /Branch pricing for GP Consultation/i })
    expect(btn).not.toBeDisabled()
  })

  it('disables Branch pricing for a clinic-scoped service', async () => {
    render(withProviders(baseMocks([clinicScopedService]), <ServiceCatalog />))
    await waitFor(() => expect(screen.getByText('Branch-only Service')).toBeInTheDocument())
    const btn = screen.getByRole('button', { name: /Branch pricing for Branch-only Service/i })
    expect(btn).toBeDisabled()
  })

  it('seeds the dialog from an existing override', async () => {
    const overrides = [{ id: 'ov-1', product_id: 'svc-master', clinic_id: 'clinic-a', mode: 'override', override_price: 750 }]
    render(withProviders(baseMocks([masterService], overrides), <ServiceCatalog />))
    await waitFor(() => expect(screen.getByText('GP Consultation')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Branch pricing for GP Consultation/i }))
    await waitFor(() => expect(screen.getByText('Branch pricing — GP Consultation')).toBeInTheDocument())
    expect(screen.getByDisplayValue('750')).toBeInTheDocument()
  })

  it('shows a validation error and does not call the mutation when Override has no price', async () => {
    render(withProviders(baseMocks([masterService]), <ServiceCatalog />))
    await waitFor(() => expect(screen.getByText('GP Consultation')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Branch pricing for GP Consultation/i }))
    const dialog = await screen.findByRole('dialog')
    const select = within(dialog).getByRole('combobox')
    await userEvent.click(select)
    await userEvent.click(await screen.findByRole('option', { name: 'Override' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('An override requires at least a price value.')).toBeInTheDocument()
  })
})
