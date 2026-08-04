import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './styles/index.css'

const CitySelectorPage = lazy(() => import('./pages/CitySelectorPage.tsx'))
const App = lazy(() => import('./app/App'))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<CitySelectorPage />} />
            <Route path="/toronto" element={<App />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)
