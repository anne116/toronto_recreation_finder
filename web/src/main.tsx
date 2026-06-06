import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './app/App'
import CitySelectorPage from './pages/CitySelectorPage.tsx'
import './styles/index.css'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CitySelectorPage />} />
        <Route path="/toronto" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
