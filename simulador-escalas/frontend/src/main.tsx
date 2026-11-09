import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import EscalasApp from './escalas/EscalasApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <EscalasApp />
    </BrowserRouter>
  </StrictMode>,
)
