import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { gql } from '@apollo/client'
import PatientImportPage from './index'

// P2-05 — jsdom's Blob/File polyfill has no working .text() in this Jest
// version (confirmed in this same session's own P1-18 work, TR215) --
// backed by FileReader instead, which jsdom does support. Scoped to this
// file only (not a global stub), and only applied when the native
// implementation is genuinely missing.
if (!File.prototype.text) {
  File.prototype.text = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(this)
    })
  }
}

const PARSE_IMPORT_PREVIEW = gql`
  query ParseImportPreview($input: ParseImportPreviewInput!) {
    parseImportPreview(input: $input) {
      headers
      sampleRows {
        values
      }
      suggestedMapping {
        sourceColumn
        targetField
      }
      totalRows
    }
  }
`
const DRY_RUN_IMPORT = gql`
  query DryRunImport($input: DryRunImportInput!) {
    dryRunImport(input: $input) {
      totalRows
      validRows
      errorRows
      rowErrors {
        rowNumber
        errors
      }
      sampleValidRows {
        rowNumber
        first_name
        last_name
        email
        phone
        date_of_birth
      }
    }
  }
`
const COMMIT_IMPORT = gql`
  mutation CommitImport($input: CommitImportInput!) {
    commitImport(input: $input) {
      importJobId
      totalRows
      importedRows
      errorRows
      rowErrors {
        rowNumber
        errors
      }
    }
  }
`

const CSV_CONTENT = 'Full Name,Email,Phone,DOB\nAnita Sharma,anita@example.com,9876543210,1990-01-01\n'

function makeCsvFile(content = CSV_CONTENT, name = 'patients.csv') {
  return new File([content], name, { type: 'text/csv' })
}

function previewMock(csvContent = CSV_CONTENT) {
  return {
    request: { query: PARSE_IMPORT_PREVIEW, variables: { input: { csvContent } } },
    result: {
      data: {
        parseImportPreview: {
          __typename: 'ImportPreview',
          headers: ['Full Name', 'Email', 'Phone', 'DOB'],
          sampleRows: [{ __typename: 'ImportSampleRow', values: ['Anita Sharma', 'anita@example.com', '9876543210', '1990-01-01'] }],
          suggestedMapping: [
            { __typename: 'SuggestedColumnMapping', sourceColumn: 'Full Name', targetField: 'full_name' },
            { __typename: 'SuggestedColumnMapping', sourceColumn: 'Email', targetField: 'email' },
            { __typename: 'SuggestedColumnMapping', sourceColumn: 'Phone', targetField: 'phone' },
            { __typename: 'SuggestedColumnMapping', sourceColumn: 'DOB', targetField: 'date_of_birth' },
          ],
          totalRows: 1,
        },
      },
    },
  }
}

const DEFAULT_MAPPING = [
  { sourceColumn: 'Full Name', targetField: 'full_name' },
  { sourceColumn: 'Email', targetField: 'email' },
  { sourceColumn: 'Phone', targetField: 'phone' },
  { sourceColumn: 'DOB', targetField: 'date_of_birth' },
]

function renderPage(mocks) {
  return render(
    <SnackbarProvider>
      <MockedProvider mocks={mocks} addTypename={false}>
        <PatientImportPage />
      </MockedProvider>
    </SnackbarProvider>,
  )
}

describe('manager/imports — patient data importer (P2-05)', () => {
  it('uploads a CSV and advances to the mapping step with suggested mappings pre-filled', async () => {
    renderPage([previewMock()])

    const input = document.querySelector('input[type="file"]')
    await userEvent.upload(input, makeCsvFile())

    await waitFor(() => expect(screen.getByText(/1 row found/)).toBeInTheDocument())
    expect(screen.getByText('Full Name')).toBeInTheDocument()
    // MUI's Select is not a native <select> -- its hidden form input holds
    // the raw enum value ('full_name'), not the human-readable label
    // ('Full name') getByDisplayValue would otherwise need to match.
    expect(screen.getAllByDisplayValue('full_name')[0]).toBeInTheDocument()
  })

  it('runs a dry run with the current mapping and shows real result counts', async () => {
    renderPage([
      previewMock(),
      {
        request: { query: DRY_RUN_IMPORT, variables: { input: { csvContent: CSV_CONTENT, mapping: DEFAULT_MAPPING } } },
        result: {
          data: {
            dryRunImport: {
              __typename: 'ImportDryRunResult',
              totalRows: 1,
              validRows: 1,
              errorRows: 0,
              rowErrors: [],
              sampleValidRows: [
                { __typename: 'ImportPatientPreview', rowNumber: 2, first_name: 'Anita', last_name: 'Sharma', email: 'anita@example.com', phone: '9876543210', date_of_birth: '1990-01-01' },
              ],
            },
          },
        },
      },
    ])

    const input = document.querySelector('input[type="file"]')
    await userEvent.upload(input, makeCsvFile())
    await waitFor(() => expect(screen.getByText(/1 row found/)).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Run dry run' }))

    await waitFor(() => expect(screen.getByText('Ready to import')).toBeInTheDocument())
    expect(screen.getByText('Anita Sharma')).toBeInTheDocument()
  })

  it('shows real per-row errors from a dry run, never a fabricated success', async () => {
    renderPage([
      previewMock(),
      {
        request: { query: DRY_RUN_IMPORT, variables: { input: { csvContent: CSV_CONTENT, mapping: DEFAULT_MAPPING } } },
        result: {
          data: {
            dryRunImport: {
              __typename: 'ImportDryRunResult',
              totalRows: 1,
              validRows: 0,
              errorRows: 1,
              rowErrors: [{ __typename: 'ImportRowError', rowNumber: 2, errors: ['email is required'] }],
              sampleValidRows: [],
            },
          },
        },
      },
    ])

    const input = document.querySelector('input[type="file"]')
    await userEvent.upload(input, makeCsvFile())
    await waitFor(() => expect(screen.getByText(/1 row found/)).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Run dry run' }))

    await waitFor(() => expect(screen.getByText('email is required')).toBeInTheDocument())
    // The commit button stays visible (its own label states the real
    // count, matching UI-11's "never disable without telling the user
    // why") but is disabled with zero valid rows -- never lets the user
    // proceed into an import that would create nothing.
    expect(screen.getByRole('button', { name: 'Import 0 patients' })).toBeDisabled()
  })

  it('commits the import via the real mutation and shows the final result', async () => {
    renderPage([
      previewMock(),
      {
        request: { query: DRY_RUN_IMPORT, variables: { input: { csvContent: CSV_CONTENT, mapping: DEFAULT_MAPPING } } },
        result: {
          data: {
            dryRunImport: {
              __typename: 'ImportDryRunResult',
              totalRows: 1,
              validRows: 1,
              errorRows: 0,
              rowErrors: [],
              sampleValidRows: [
                { __typename: 'ImportPatientPreview', rowNumber: 2, first_name: 'Anita', last_name: 'Sharma', email: 'anita@example.com', phone: '9876543210', date_of_birth: '1990-01-01' },
              ],
            },
          },
        },
      },
      {
        request: { query: COMMIT_IMPORT, variables: { input: { csvContent: CSV_CONTENT, mapping: DEFAULT_MAPPING } } },
        result: {
          data: {
            commitImport: {
              __typename: 'ImportCommitResult',
              importJobId: 'job-1',
              totalRows: 1,
              importedRows: 1,
              errorRows: 0,
              rowErrors: [],
            },
          },
        },
      },
    ])

    const input = document.querySelector('input[type="file"]')
    await userEvent.upload(input, makeCsvFile())
    await waitFor(() => expect(screen.getByText(/1 row found/)).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Run dry run' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Import 1 patient' })).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Import 1 patient' }))

    await waitFor(() => expect(screen.getByText(/Imported 1 of 1 rows/)).toBeInTheDocument())
  }, 15000)

  it('lets a human override a suggested mapping before running the dry run', async () => {
    renderPage([
      previewMock(),
      {
        request: {
          query: DRY_RUN_IMPORT,
          variables: {
            input: {
              csvContent: CSV_CONTENT,
              mapping: [
                { sourceColumn: 'Full Name', targetField: 'full_name' },
                { sourceColumn: 'Email', targetField: 'email' },
                { sourceColumn: 'Phone', targetField: 'phone' },
                { sourceColumn: 'DOB', targetField: 'medical_notes' },
              ],
            },
          },
        },
        result: {
          data: {
            dryRunImport: {
              __typename: 'ImportDryRunResult',
              totalRows: 1,
              validRows: 0,
              errorRows: 1,
              rowErrors: [{ __typename: 'ImportRowError', rowNumber: 2, errors: ['date_of_birth is required'] }],
              sampleValidRows: [],
            },
          },
        },
      },
    ])

    const input = document.querySelector('input[type="file"]')
    await userEvent.upload(input, makeCsvFile())
    await waitFor(() => expect(screen.getByText(/1 row found/)).toBeInTheDocument())

    const rows = screen.getAllByRole('row')
    const dobRow = rows.find((r) => within(r).queryByText('DOB'))
    const select = within(dobRow).getByRole('combobox')
    await userEvent.click(select)
    await userEvent.click(await screen.findByRole('option', { name: 'Medical notes / history' }))

    await userEvent.click(screen.getByRole('button', { name: 'Run dry run' }))
    await waitFor(() => expect(screen.getByText('date_of_birth is required')).toBeInTheDocument())
  })
})
