import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Aplica o tema salvo (ou a preferência do sistema, na primeira vez)
// antes de renderizar, para não "piscar" claro e depois escurecer.
const temaSalvo = localStorage.getItem('estudai_tema');
const prefereEscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (temaSalvo === 'dark' || (!temaSalvo && prefereEscuro)) {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
