import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Tipografías autoalojadas: se empaquetan con la app para que la PWA se vea
// igual sin conexión (nada de Google Fonts por CDN).
import '@fontsource-variable/inter'
import '@fontsource-variable/sora'

// Único archivo de estilos: importa Tailwind y define todos los design tokens.
import './styles/theme.css'

import App from './App.tsx'
import { inicializarAuth } from './stores/auth.ts'

// Conecta el store de auth con Supabase antes de montar React. Va aquí, fuera
// de los componentes, para que StrictMode no duplique la suscripción.
inicializarAuth()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
