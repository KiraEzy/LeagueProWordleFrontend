import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Ant Design v5 doesn't require explicit CSS import
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
