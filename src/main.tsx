import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import './index.css'
import App from './App'

function fallbackRender({ error }: { error: any }) {
  return (
    <div style={{ color: 'red', padding: '20px', background: 'black', width: '100vw', height: '100vh', fontFamily: 'monospace', zIndex: 9999, position: 'absolute' }}>
      <h1>FATAL REACT ERROR</h1>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{error.stack}</pre>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackRender={fallbackRender}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
