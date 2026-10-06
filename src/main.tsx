import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// flag SVGs vendored in src/assets/flags (see FlagIcon.tsx)
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
