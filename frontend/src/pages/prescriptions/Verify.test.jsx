import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { HelmetProvider } from 'react-helmet-async'
import { gql } from '@apollo/client'
import VerifyPrescription from './Verify'

// REQ136 — re-declared to match Verify.jsx's own gql document exactly
// (query AST equality, not import identity — MockedProvider's own
// matching convention, same as pages/auth/reset-password.test.jsx).
const VERIFY_PRESCRIPTION = gql`
  query VerifyPrescription($id: ID!) {
    verifyPrescriptionIntegrity(id: $id) {
      prescription_id
      valid
      stored_hash
      computed_hash
    }
  }
`

function renderPage({ path = '/prescriptions/verify', mocks = [] } = {}) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <MockedProvider mocks={mocks} addTypename={false}>
          <VerifyPrescription />
        </MockedProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )
}

describe('prescriptions/Verify (REQ136)', () => {
  it('pre-fills the id field from a ?id= query param and does not auto-run the query', () => {
    renderPage({ path: '/prescriptions/verify?id=rx-123' })
    expect(screen.getByLabelText('Prescription ID')).toHaveValue('rx-123')
    expect(screen.queryByText(/authentic|could not be verified/)).not.toBeInTheDocument()
  })

  it('shows a success state with the formatted verification code for a valid prescription', async () => {
    const mocks = [
      {
        request: { query: VERIFY_PRESCRIPTION, variables: { id: 'rx-123' } },
        result: {
          data: {
            verifyPrescriptionIntegrity: {
              prescription_id: 'rx-123',
              valid: true,
              stored_hash: 'abcdef012345',
              computed_hash: 'abcdef012345',
            },
          },
        },
      },
    ]
    renderPage({ path: '/prescriptions/verify?id=rx-123', mocks })

    fireEvent.click(screen.getByRole('button', { name: 'Verify' }))

    await waitFor(() => expect(screen.getByText('This prescription is authentic.')).toBeInTheDocument())
    expect(screen.getByText(/Verification code on file: ABCD-EF01-2345/)).toBeInTheDocument()
  })

  it('shows a tamper-warning state for an invalid prescription', async () => {
    const mocks = [
      {
        request: { query: VERIFY_PRESCRIPTION, variables: { id: 'rx-456' } },
        result: {
          data: {
            verifyPrescriptionIntegrity: {
              prescription_id: 'rx-456',
              valid: false,
              stored_hash: 'abcdef012345',
              computed_hash: 'ffffff999999',
            },
          },
        },
      },
    ]
    renderPage({ mocks })

    fireEvent.change(screen.getByLabelText('Prescription ID'), { target: { value: 'rx-456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }))

    await waitFor(() => expect(screen.getByText('This prescription could not be verified.')).toBeInTheDocument())
    expect(screen.getByText(/Do not rely on this copy/)).toBeInTheDocument()
  })

  it('shows an honest "no verification code on file" state for a legacy prescription with no stored hash', async () => {
    const mocks = [
      {
        request: { query: VERIFY_PRESCRIPTION, variables: { id: 'rx-legacy' } },
        result: {
          data: {
            verifyPrescriptionIntegrity: {
              prescription_id: 'rx-legacy',
              valid: true,
              stored_hash: null,
              computed_hash: null,
            },
          },
        },
      },
    ]
    renderPage({ mocks })

    fireEvent.change(screen.getByLabelText('Prescription ID'), { target: { value: 'rx-legacy' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }))

    await waitFor(() => expect(screen.getByText('This prescription is authentic.')).toBeInTheDocument())
    expect(screen.getByText(/This prescription has no verification code on file/)).toBeInTheDocument()
    expect(screen.queryByText(/Verification code on file:/)).not.toBeInTheDocument()
  })

  it('disables the Verify button while the id field is empty', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled()
  })
})
