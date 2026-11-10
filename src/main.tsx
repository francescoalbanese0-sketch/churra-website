import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Separate, lightweight pages that share the bundle but not the cinematic site.
const Admin = lazy(() => import('./admin/Admin.tsx'))
const Cancel = lazy(() => import('./admin/Cancel.tsx'))
const Legal = lazy(() => import('./legal/Legal.tsx'))
const GutscheinPage = lazy(() => import('./gutschein/GutscheinPage.tsx'))
const Gutscheine = lazy(() => import('./admin/Gutscheine.tsx'))

const path = window.location.pathname.replace(/\/+$/, '')
const page =
  path === '/admin' ? <Admin />
  : path === '/admin/gutscheine' ? <Gutscheine />
  : path === '/gutschein' ? <GutscheinPage />
  : path === '/stornieren' ? <Cancel />
  : path === '/impressum' ? <Legal kind="impressum" />
  : path === '/datenschutz' ? <Legal kind="datenschutz" />
  : <App />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>{page}</Suspense>
  </StrictMode>,
)
