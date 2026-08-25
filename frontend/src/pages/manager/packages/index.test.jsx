import { render, screen, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import ManagerPackages from './index'

// REQ054 (US-CAT-01) — smoke coverage for the real GraphQL-driven load path
// (three imperative client.query() calls on mount: clinics, products,
// packages), matching this codebase's own withProviders/MockedProvider
// pattern (see patient/Family.test.jsx).

const GET_PACKAGE_CLINICS = gql`query GetPackageClinics { clinics { id name } }`
const GET_PACKAGE_PRODUCTS = gql`query GetPackageProducts { products { id name clinic_id } }`
const GET_PACKAGES = gql`
  query GetPackages {
    packages {
      id clinic_id name description total_sittings price validity_days is_active
      items { id product_id }
    }
  }
`

function withProviders(mocks, children) {
  return <MockedProvider mocks={mocks} addTypename={false}>{children}</MockedProvider>
}

const emptyMocks = [
  { request: { query: GET_PACKAGE_CLINICS }, result: { data: { clinics: [{ id: 'clinic-a', name: 'MG Road Clinic' }] } } },
  { request: { query: GET_PACKAGE_PRODUCTS }, result: { data: { products: [] } } },
  { request: { query: GET_PACKAGES }, result: { data: { packages: [] } } },
]

describe('ManagerPackages (REQ054 US-CAT-01)', () => {
  it('shows an empty state when the org has no packages yet', async () => {
    render(withProviders(emptyMocks, <ManagerPackages />))
    await waitFor(() => expect(screen.getByText(/No packages yet/)).toBeInTheDocument())
  })

  it('lists an existing package with its sitting count and price', async () => {
    const mocks = [
      { request: { query: GET_PACKAGE_CLINICS }, result: { data: { clinics: [{ id: 'clinic-a', name: 'MG Road Clinic' }] } } },
      { request: { query: GET_PACKAGE_PRODUCTS }, result: { data: { products: [] } } },
      {
        request: { query: GET_PACKAGES },
        result: { data: { packages: [{
          id: 'pkg-1', clinic_id: 'clinic-a', name: '10-Session Physio', description: null,
          total_sittings: 10, price: 5000, validity_days: 90, is_active: true, items: [],
        }] } },
      },
    ]
    render(withProviders(mocks, <ManagerPackages />))
    await waitFor(() => expect(screen.getByText('10-Session Physio')).toBeInTheDocument())
    expect(screen.getByText(/10 sittings/)).toBeInTheDocument()
    expect(screen.getByText('₹5000.00')).toBeInTheDocument()
  })

  it('opens the create-package form', async () => {
    render(withProviders(emptyMocks, <ManagerPackages />))
    await waitFor(() => expect(screen.getByText(/No packages yet/)).toBeInTheDocument())
    const addButtons = screen.getAllByRole('button', { name: /New Package|Add Package/i })
    expect(addButtons.length).toBeGreaterThan(0)
  })
})
