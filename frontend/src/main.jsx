import './index.css'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import './i18n/config' // P1-07 — side-effect init; must run before anything renders
import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { ApolloProvider } from '@apollo/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { SnackbarProvider } from 'notistack'
import { Box, CircularProgress } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

import apolloClient from './apollo/client.js'
import { AuthProvider } from './context/AuthContext'
import { ThemeModeProvider } from './context/ThemeContext'
import { GlobalSnackbarProvider } from './components/shared/GlobalSnackbar'
import { reportWebVitals } from './utils/reportWebVitals'
import App from './App'

// P1-07 — only ever suspends while actively loading a NON-default language
// (English is bundled synchronously — see i18n/config.js's own comment on
// why); a real, if rare, loading state, not a permanent one.
const I18nBootLoader = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
    <CircularProgress />
  </Box>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <ApolloProvider client={apolloClient}>
        <BrowserRouter>
          <ThemeModeProvider>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <AuthProvider>
                <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                  <GlobalSnackbarProvider>
                    <Suspense fallback={<I18nBootLoader />}>
                      <App />
                    </Suspense>
                  </GlobalSnackbarProvider>
                </SnackbarProvider>
              </AuthProvider>
            </LocalizationProvider>
          </ThemeModeProvider>
        </BrowserRouter>
      </ApolloProvider>
    </HelmetProvider>
  </React.StrictMode>,
)

// P1-18 (PERF-5)
reportWebVitals()
