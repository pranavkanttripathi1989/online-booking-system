import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { HelmetProvider } from 'react-helmet-async'
import { SnackbarProvider } from 'notistack'
import EditProductPage from './edit'
import { PRODUCT_DETAIL_QUERY } from '../../../graphql/queries'

// DATA-13 — this page previously fell back to a fabricated
// DEFAULT_MOCK_PRODUCT whenever a real "no such product" result came back
// (data.product: null), with no not-found guard at all. These tests assert
// the fixed, guarded behavior.

const PRODUCT_ID = 'product-real-1'

function renderPage(mocks) {
  return render(
    <HelmetProvider>
      <SnackbarProvider>
        <MemoryRouter initialEntries={[`/manager/products/${PRODUCT_ID}/edit`]}>
          <MockedProvider mocks={mocks} addTypename={true}>
            <Routes>
              <Route path="/manager/products/:id/edit" element={<EditProductPage />} />
            </Routes>
          </MockedProvider>
        </MemoryRouter>
      </SnackbarProvider>
    </HelmetProvider>,
  )
}

describe('manager/products/edit', () => {
  it('renders the real fetched product, never a fabricated default', async () => {
    const mocks = [
      {
        request: { query: PRODUCT_DETAIL_QUERY, variables: { id: PRODUCT_ID } },
        result: {
          data: {
            product: {
              __typename: 'Product',
              id: PRODUCT_ID,
              name: 'Real Product',
              description: 'A real product',
              price: 99.5,
              stock_quantity: 10,
              sku: 'REAL-1',
              is_active: true,
            },
          },
        },
      },
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByDisplayValue('Real Product')).toBeInTheDocument())
    expect(screen.getByDisplayValue('REAL-1')).toBeInTheDocument()
  })

  it('a genuinely nonexistent product (real success, product: null) shows a not-found state, never a fabricated default record', async () => {
    const mocks = [
      { request: { query: PRODUCT_DETAIL_QUERY, variables: { id: PRODUCT_ID } }, result: { data: { product: null } } },
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByText('Product not found')).toBeInTheDocument())
    expect(screen.queryByDisplayValue('Unknown Product')).not.toBeInTheDocument()
  })
})
