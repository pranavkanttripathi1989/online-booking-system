import './index.css'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ApolloProvider } from '@apollo/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { SnackbarProvider } from 'notistack'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

import apolloClient from './apollo/client.js'
import { AuthProvider } from './context/AuthContext'
import { medicalTheme } from './theme/index.js'
import { GlobalSnackbarProvider } from './components/shared/GlobalSnackbar'
import App from './App'


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <ApolloProvider client={apolloClient}>
        <BrowserRouter>
          <ThemeProvider theme={medicalTheme}>
            <CssBaseline />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <AuthProvider>
                <SnackbarProvider
                  maxSnack={3}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                  <GlobalSnackbarProvider>
                    <App />
                  </GlobalSnackbarProvider>
                </SnackbarProvider>
              </AuthProvider>
            </LocalizationProvider>
          </ThemeProvider>
        </BrowserRouter>
      </ApolloProvider>
    </HelmetProvider>
  </React.StrictMode>
)
