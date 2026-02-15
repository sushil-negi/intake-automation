import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { logError } from './utils/auditLog'

// Global error handlers — capture unhandled errors to audit log
window.addEventListener('error', (event) => {
  logError(event.error ?? event.message, 'window.onerror');
});

window.addEventListener('unhandledrejection', (event) => {
  logError(event.reason, 'unhandledrejection');
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
