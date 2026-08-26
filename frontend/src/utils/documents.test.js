import { downloadAuthenticatedPdf } from './documents'

// REQ057 (US-PAT-02) — the authenticated-fetch + Blob-download helper the
// three PDF-download buttons (prescriptions/invoices/visit-summaries) share.
// import.meta.env is shimmed to an empty object under Jest (babel.config.cjs)
// so the real fallback (`... || 'http://localhost:4000/graphql'`) resolves
// deterministically here, same as it would for a real dev machine with no
// VITE_GRAPHQL_URL set.

describe('downloadAuthenticatedPdf', () => {
  const ORIGINAL_FETCH = global.fetch
  let createObjectURLSpy
  let revokeObjectURLSpy
  let clickSpy

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    createObjectURLSpy = jest.fn(() => 'blob:mock-url')
    revokeObjectURLSpy = jest.fn()
    global.URL.createObjectURL = createObjectURLSpy
    global.URL.revokeObjectURL = revokeObjectURLSpy
    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    jest.useFakeTimers()
  })

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH
    clickSpy.mockRestore()
    jest.useRealTimers()
  })

  // P1-02/SEC-2 — the httpOnly session cookie is sent automatically by the
  // browser (credentials:'include'); there is no token anywhere in JS for
  // this helper to read or attach as a header anymore.
  it('sends credentials:include, against the default local API base', async () => {
    const mockBlob = new Blob(['%PDF-fake'], { type: 'application/pdf' })
    global.fetch = jest.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(mockBlob) })

    await downloadAuthenticatedPdf('/documents/prescriptions/rx-1/pdf', 'prescription-rx-1.pdf')

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/documents/prescriptions/rx-1/pdf',
      { credentials: 'include' },
    )
  })

  it('triggers a real Blob download via a synthetic anchor click', async () => {
    const mockBlob = new Blob(['%PDF-fake'], { type: 'application/pdf' })
    global.fetch = jest.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(mockBlob) })

    await downloadAuthenticatedPdf('/documents/visit-summaries/enc-1/pdf', 'visit-summary-enc-1.pdf')

    expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    jest.runAllTimers()
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
  })

  it('throws the backend\'s own error message on a non-200 response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'Prescription not found' }),
    })

    await expect(downloadAuthenticatedPdf('/documents/prescriptions/nope/pdf', 'x.pdf')).rejects.toThrow('Prescription not found')
  })

  it('falls back to a generic status-coded message when the error body has none', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    })

    await expect(downloadAuthenticatedPdf('/documents/invoices/x/pdf', 'x.pdf')).rejects.toThrow(/500/)
  })
})
