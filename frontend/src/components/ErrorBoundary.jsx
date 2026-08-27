import { Component } from 'react'
import ErrorFallback from './ErrorFallback'
import { reportError } from '../utils/errorReporting'

/**
 * ErrorBoundary — Class-based React Error Boundary.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <ManagerAvailability />
 *   </ErrorBoundary>
 *
 * Optionally supply a custom fallback:
 *   <ErrorBoundary fallback={<MyCustomFallback />}>
 *       ...
 *   </ErrorBoundary>
 *
 * Toggle: wraps any subtree — no extra config required.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
    this.reset = this.reset.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info)
    // P1-18 — fire-and-forget; reportError() is a clean no-op when
    // VITE_SENTRY_DSN is unset, and never blocks the fallback UI below
    // on a network round-trip to a third-party service.
    reportError(error, info)
  }

  reset() {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return <ErrorFallback error={this.state.error} resetErrorBoundary={this.reset} />
    }
    return this.props.children
  }
}
