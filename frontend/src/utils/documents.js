// REQ057 (US-PAT-02) frontend wiring — the three REST PDF-download endpoints
// (`GET /documents/{prescriptions,invoices,visit-summaries}/:id/pdf`) require
// a real `Authorization: Bearer` header, which a plain `<a href>` can't send.
// Token lookup and API-base derivation match EncounterWorkspace.jsx's own
// existing `handleUpload` flow exactly, so this stays consistent with the
// one other place in this codebase that already does an authenticated
// REST (non-GraphQL) call.
export async function downloadAuthenticatedPdf(path, filename) {
  const token = localStorage.getItem('medibook_token') || sessionStorage.getItem('medibook_token')
  const apiBase = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')

  const res = await fetch(`${apiBase}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message || `Failed to download document (${res.status})`)
  }

  const blob = await res.blob()
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
