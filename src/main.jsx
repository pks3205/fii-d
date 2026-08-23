import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { hydrateFromNative } from './lib/store.js'
import './styles.css'

const mount = () => ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// On native, hydrate persistent storage into localStorage BEFORE first render
// so saved days are always there. On web this resolves instantly.
hydrateFromNative().finally(mount)
