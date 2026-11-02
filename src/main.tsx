import './polyfills.ts' // primero: Vite no incluye Buffer y el kit de Cavos lo usa (docs/firma-cavos.md)
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
