import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import './lib/posthog' // Initialize PostHog analytics
import App from './App.jsx'

// Initialize Sentry for error tracking (only in production)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Only send errors in production
    enabled: import.meta.env.PROD,
    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)

// Simple error fallback component
function ErrorFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground">
        We've been notified and are working on a fix.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
      >
        Reload Page
      </button>
    </div>
  )
}
