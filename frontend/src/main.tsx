import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'

// Ferramenta anterior em "/" e simulador de escalas em "/escalas" (carregados sob demanda,
// para que o CSS de um não vaze para o outro).
const LegacyApp = lazy(() => import('./App.tsx'))
const EscalasApp = lazy(() => import('./escalas/EscalasApp.tsx'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/escalas/*" element={<EscalasApp />} />
          <Route path="*" element={<LegacyApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
