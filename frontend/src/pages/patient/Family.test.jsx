import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { HelmetProvider } from 'react-helmet-async'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { gql } from '@apollo/client'
import Family from './Family'

function withProviders(mocks, children) {
  return (
    <HelmetProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      </LocalizationProvider>
    </HelmetProvider>
  )
}

const MY_DEPENDANTS_QUERY = gql`
  query MyDependants {
    myDependants {
      id
      relation
      patient {
        id
        full_name
        date_of_birth
        gender
      }
    }
  }
`

describe('Family (REQ018 US-BOOK-02)', () => {
  it('shows an empty state when the caller has no dependants yet', async () => {
    render(withProviders([{ request: { query: MY_DEPENDANTS_QUERY }, result: { data: { myDependants: [] } } }], <Family />))
    await waitFor(() => expect(screen.getByText(/No dependants added yet/)).toBeInTheDocument())
  })

  it('lists an existing dependant with their relationship label', async () => {
    const dependants = [
      { id: 'rel-1', relation: 'child', patient: { id: 'dep-1', full_name: 'Little Sharma', date_of_birth: '2018-01-01', gender: 'male' } },
    ]
    render(withProviders([{ request: { query: MY_DEPENDANTS_QUERY }, result: { data: { myDependants: dependants } } }], <Family />))
    await waitFor(() => expect(screen.getByText('Little Sharma')).toBeInTheDocument())
    expect(screen.getByText(/child ·/)).toBeInTheDocument()
  })

  it('opens the Add Dependant dialog', async () => {
    render(withProviders([{ request: { query: MY_DEPENDANTS_QUERY }, result: { data: { myDependants: [] } } }], <Family />))
    fireEvent.click(screen.getByRole('button', { name: 'Add Dependant' }))
    expect(await screen.findByText('Add a Dependant')).toBeInTheDocument()
  })
})
