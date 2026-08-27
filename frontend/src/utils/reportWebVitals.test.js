const handlers = {}
jest.mock('web-vitals', () => ({
  onLCP: (cb) => {
    handlers.LCP = cb
  },
  onINP: (cb) => {
    handlers.INP = cb
  },
  onCLS: (cb) => {
    handlers.CLS = cb
  },
  onFCP: (cb) => {
    handlers.FCP = cb
  },
  onTTFB: (cb) => {
    handlers.TTFB = cb
  },
}))

import { reportWebVitals } from './reportWebVitals'

describe('reportWebVitals (P1-18, PERF-5)', () => {
  let sendBeacon

  beforeEach(() => {
    sendBeacon = jest.fn(() => true)
    Object.defineProperty(window.navigator, 'sendBeacon', { value: sendBeacon, configurable: true })
    window.history.pushState({}, '', '/patients/8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7')
    reportWebVitals()
  })

  it('registers a handler for all five Core Web Vitals metrics', () => {
    expect(Object.keys(handlers).sort()).toEqual(['CLS', 'FCP', 'INP', 'LCP', 'TTFB'])
  })

  it('reports a metric via sendBeacon with name, value and id', () => {
    handlers.LCP({ name: 'LCP', value: 2100.4, id: 'v1-1' })

    expect(sendBeacon).toHaveBeenCalledTimes(1)
    const [endpoint, blob] = sendBeacon.mock.calls[0]
    expect(endpoint).toMatch(/\/observability\/web-vitals$/)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('sends a route pattern, never the resolved URL with a real record id', () => {
    // jsdom's Blob polyfill has no .text()/.arrayBuffer() in this Jest
    // version, so the payload is captured at construction time instead of
    // read back from the Blob asynchronously.
    const parts = []
    const RealBlob = global.Blob
    global.Blob = jest.fn((blobParts, options) => {
      parts.push(...blobParts)
      return new RealBlob(blobParts, options)
    })

    handlers.CLS({ name: 'CLS', value: 0.02, id: 'v2-1' })

    global.Blob = RealBlob
    const body = JSON.parse(parts[0])
    expect(body.page).toBe('/patients/:id')
    expect(body.page).not.toMatch(/8e9ed6bf/)
  })

  it('falls back to fetch with keepalive when sendBeacon is unavailable', () => {
    Object.defineProperty(window.navigator, 'sendBeacon', { value: undefined, configurable: true })
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }))

    handlers.TTFB({ name: 'TTFB', value: 300, id: 'v3-1' })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [, options] = global.fetch.mock.calls[0]
    expect(options.keepalive).toBe(true)
    expect(options.method).toBe('POST')
  })
})
