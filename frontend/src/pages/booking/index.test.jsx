import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import dayjs from 'dayjs'
import BookingWizard from './index'
import { useAuth } from '../../hooks/useAuth'

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

const DOCTOR_ID = 'doc-1'

const GET_CLINICIAN_AND_PRODUCTS_SHAPE = {
  getClinician: { id: DOCTOR_ID, name: 'Sarah Mitchell', clinicianType: 'General Physician', clinic: { id: 'clinic-1', name: 'MG Road Clinic' } },
  getClinicianAvailability: [{ id: 'av-1', dayOfWeek: dayjs().day(), startTime: '09:00', endTime: '17:00' }],
  getProducts: [
    { id: 'prod-simple', name: 'General Consultation', description: '30-minute visit', price: 500, product_type: 'simple', variations: [], cancellation_rules: null },
    {
      id: 'prod-variable',
      name: 'Specialist Consultation',
      description: 'Choose a duration',
      price: 800,
      product_type: 'variable',
      variations: [{ id: 'var-30', name: '30 minutes', price: 800 }, { id: 'var-60', name: '60 minutes', price: 1400 }],
      cancellation_rules: null,
    },
  ],
}

function buildMocks({ availability = GET_CLINICIAN_AND_PRODUCTS_SHAPE.getClinicianAvailability } = {}) {
  // Matches booking/index.jsx's own GET_CLINICIAN_AND_PRODUCTS / GET_APPOINTMENTS
  // gql documents exactly, imported the same way the component itself does
  // isn't possible from a test file, so these are re-declared with matching
  // shape+variables — MockedProvider matches on the query AST, and Apollo
  // treats two identically-printed gql documents as equal for this purpose.
  const { gql } = require('@apollo/client')
  const GET_CLINICIAN_AND_PRODUCTS = gql`
    query GetClinicianAndProducts($id: ID!) {
      getClinician(id: $id) { id name clinicianType clinic { id name } }
      getClinicianAvailability(clinicianId: $id) { id dayOfWeek startTime endTime }
      getProducts(clinicianId: $id) { id name description price product_type variations { id name price } cancellation_rules { id hoursNoticeRequired } }
    }
  `
  const GET_APPOINTMENTS = gql`
    query GetAppointments($clinicianId: ID!, $date: String!) {
      getAppointments(clinicianId: $clinicianId, date: $date) { id startTime endTime }
    }
  `
  return [
    {
      request: { query: GET_CLINICIAN_AND_PRODUCTS, variables: { id: DOCTOR_ID } },
      result: { data: { ...GET_CLINICIAN_AND_PRODUCTS_SHAPE, getClinicianAvailability: availability } },
    },
    {
      request: { query: GET_APPOINTMENTS, variables: { clinicianId: DOCTOR_ID, date: dayjs().format('YYYY-MM-DD') } },
      result: { data: { getAppointments: [] } },
    },
  ]
}

function renderWizard(mocks = buildMocks()) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter initialEntries={[`/appointments/book?doctor=${DOCTOR_ID}`]}>
        <BookingWizard />
      </MemoryRouter>
    </MockedProvider>,
  )
}

function nextButton() {
  return screen.getByRole('button', { name: 'Next Step' })
}

// MUI renders a required field's label as "First Name" plus a separate
// child <span>*</span>, so the label's full accessible text is "First Name *"
// -- exact:false so this matches the visible "First Name" label text without
// hardcoding the asterisk formatting as part of every query.
function field(label) {
  return screen.getByLabelText(label, { exact: false })
}

describe('BookingWizard — Step 0 (Select Time) validation gate', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: null })
  })
  afterEach(() => jest.resetAllMocks())

  it('disables Next Step until a real slot is selected', async () => {
    renderWizard()
    await waitFor(() => expect(screen.getByText('Sarah Mitchell')).toBeInTheDocument())
    expect(nextButton()).toBeDisabled()

    // Real slots come from the mocked getClinicianAvailability response
    // (BUG011: this used to render a hardcoded 09:00-17:00 mock range
    // regardless of real data — asserting a specific real slot time proves
    // this test is driving real data, not a fallback).
    const slot = await screen.findByRole('button', { name: '9:00 AM' })
    fireEvent.click(slot)
    expect(nextButton()).toBeEnabled()
  })

  it('shows "No availability" and keeps Next Step disabled when the clinician has no real slots today', async () => {
    renderWizard(buildMocks({ availability: [] }))
    await waitFor(() => expect(screen.getByText('Sarah Mitchell')).toBeInTheDocument())
    expect(screen.getByText('No availability for this date. Please select another date.')).toBeInTheDocument()
    expect(nextButton()).toBeDisabled()
  })
})

describe('BookingWizard — Step 1 (Your Details) validation gate', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: null })
  })
  afterEach(() => jest.resetAllMocks())

  async function goToStep1() {
    renderWizard()
    await waitFor(() => expect(screen.getByText('Sarah Mitchell')).toBeInTheDocument())
    fireEvent.click(await screen.findByRole('button', { name: '9:00 AM' }))
    fireEvent.click(nextButton())
    await screen.findByText('Patient Details')
  }

  it('requires first name, last name, email, and reason — each individually blocks Next Step', async () => {
    await goToStep1()
    expect(nextButton()).toBeDisabled()

    fireEvent.change(field('First Name'), { target: { value: 'Priya' } })
    expect(nextButton()).toBeDisabled()

    fireEvent.change(field('Last Name'), { target: { value: 'Sharma' } })
    expect(nextButton()).toBeDisabled()

    fireEvent.change(field('Email Address'), { target: { value: 'priya@example.com' } })
    expect(nextButton()).toBeDisabled()

    fireEvent.change(field('Reason for visit'), { target: { value: 'Annual checkup' } })
    expect(nextButton()).toBeEnabled()
  })

  it('does NOT require phone, despite the field being marked required in the UI', async () => {
    await goToStep1()
    fireEvent.change(field('First Name'), { target: { value: 'Priya' } })
    fireEvent.change(field('Last Name'), { target: { value: 'Sharma' } })
    fireEvent.change(field('Email Address'), { target: { value: 'priya@example.com' } })
    fireEvent.change(field('Reason for visit'), { target: { value: 'Annual checkup' } })
    // Phone Number is left blank on purpose.
    expect(field('Phone Number')).toHaveValue('')
    expect(nextButton()).toBeEnabled()
  })
})

describe('BookingWizard — Step 2 (Choose Service) validation gate', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: null })
  })
  afterEach(() => jest.resetAllMocks())

  async function goToStep2() {
    renderWizard()
    await waitFor(() => expect(screen.getByText('Sarah Mitchell')).toBeInTheDocument())
    fireEvent.click(await screen.findByRole('button', { name: '9:00 AM' }))
    fireEvent.click(nextButton())
    await screen.findByText('Patient Details')
    fireEvent.change(field('First Name'), { target: { value: 'Priya' } })
    fireEvent.change(field('Last Name'), { target: { value: 'Sharma' } })
    fireEvent.change(field('Email Address'), { target: { value: 'priya@example.com' } })
    fireEvent.change(field('Reason for visit'), { target: { value: 'Annual checkup' } })
    fireEvent.click(nextButton())
    await screen.findByText('Select a Service')
  }

  it('disables Next Step until a product is selected', async () => {
    await goToStep2()
    expect(nextButton()).toBeDisabled()
    fireEvent.click(screen.getByText('General Consultation'))
    expect(nextButton()).toBeEnabled()
  })

  it('keeps Next Step disabled for a variable-priced product until a variation is chosen', async () => {
    await goToStep2()
    fireEvent.click(screen.getByText('Specialist Consultation'))
    expect(nextButton()).toBeDisabled()

    // No {name: 'Select Option'} filter: the real component's <InputLabel>
    // and <Select> aren't wired with a matching id/labelId, so the combobox
    // has no accessible name in the actual DOM either -- confirmed against
    // the real markup, not a query mistake. Only one combobox is ever
    // rendered at a time in this flow.
    fireEvent.mouseDown(screen.getByRole('combobox'))
    fireEvent.click(within(screen.getByRole('listbox')).getByText('60 minutes — ₹1400'))
    expect(nextButton()).toBeEnabled()
  })

  it('resets the chosen variation when switching to a different product', async () => {
    await goToStep2()
    fireEvent.click(screen.getByText('Specialist Consultation'))
    fireEvent.mouseDown(screen.getByRole('combobox'))
    fireEvent.click(within(screen.getByRole('listbox')).getByText('30 minutes — ₹800'))
    expect(nextButton()).toBeEnabled()

    fireEvent.click(screen.getByText('General Consultation'))
    expect(nextButton()).toBeEnabled() // simple product, no variation needed
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
