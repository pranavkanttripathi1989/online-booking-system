import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals'

// P1-18 (PERF-5) — real-user Core Web Vitals, reported to the backend's
// own /observability/web-vitals endpoint (never a third-party RUM
// vendor — this payload is small, in-house, and carries no PII/PHI by
// construction: a metric name, a number, and the route *pattern*, never
// a resolved URL that could embed a patient/appointment id). `web-vitals`
// itself (~2KB gzipped) stays in the initial bundle rather than a lazy
// chunk — unlike error reporting (utils/errorReporting.js), it has to
// observe performance from the very first paint, so lazy-loading it
// would defeat the point.
const ENDPOINT = `${(import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')}/observability/web-vitals`

// Mirrors this app's own React Router route patterns (":id" for anything
// that looks like a real record id) rather than the resolved URL --
// never send a real appointment/patient id to a log line.
function routePattern() {
  return window.location.pathname.replace(/[0-9a-f-]{8,}/gi, ':id')
}

function send(metric) {
  const body = JSON.stringify({ name: metric.name, value: metric.value, id: metric.id, page: routePattern() })
  // sendBeacon survives the page unloading mid-navigation (a metric like
  // CLS/INP only finalizes right as the user leaves) -- fetch with
  // keepalive is the documented fallback where sendBeacon is unavailable.
  if (navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))
  } else {
    fetch(ENDPOINT, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => undefined)
  }
}

export function reportWebVitals() {
  onLCP(send)
  onINP(send)
  onCLS(send)
  onFCP(send)
  onTTFB(send)
}
