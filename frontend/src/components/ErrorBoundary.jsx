import { Component } from 'react'
import ErrorFallback from './ErrorFallback'

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
    // Future: send to error reporting service (Sentry, etc.)
    console.error('[ErrorBoundary] Caught error:', error, info)
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
