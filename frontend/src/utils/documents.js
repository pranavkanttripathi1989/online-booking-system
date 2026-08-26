// REQ057 (US-PAT-02) frontend wiring — the three REST PDF-download endpoints
// (`GET /documents/{prescriptions,invoices,visit-summaries}/:id/pdf`)
// require authentication, which a plain `<a href>` can't send at all — this
// is why the download is a fetch, not a bare link, same as before.
//
// P1-02/SEC-2 — credentials:'include' sends the httpOnly session cookie
// (backend/src/documents/documents.controller.ts's own cookie-first
// authenticate(), matching jwt.strategy.ts's precedent) instead of reading
// a bearer token out of localStorage/sessionStorage, which no longer holds
// one at all.
export async function downloadAuthenticatedPdf(path, filename) {
  const apiBase = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')

  const res = await fetch(`${apiBase}${path}`, {
    credentials: 'include',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message || `Failed to download document (${res.status})`)
  }

  const blob = await res.blob()
  triggerBlobDownload(blob, filename)
}

// Shared by downloadAuthenticatedPdf above and downloadPdfViaPost below —
// the actual "hand the browser a file" mechanics are identical either way;
// only how the bytes were fetched differs.
function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking immediately can cancel the download in some browsers before
  // the click's navigation has actually started.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// REQ109 — the OTP-gated share-verify endpoint is a public POST (no
// Authorization header at all -- the signed link token + OTP in the body
// together ARE the access control), unlike the three GET routes above.
export async function downloadPdfViaPost(path, body, filename) {
  const apiBase = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')

  const res = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const responseBody = await res.json().catch(() => ({}))
    throw new Error(responseBody?.message || `Failed to retrieve document (${res.status})`)
  }

  const blob = await res.blob()
  triggerBlobDownload(blob, filename)
}
