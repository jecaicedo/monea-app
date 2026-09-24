import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { LayoutApp } from '@/components/LayoutApp'
import { RutaProtegida, RutaPublica } from '@/components/rutas'
import Bolsillos from '@/pages/Bolsillos'
import IniciarSesion from '@/pages/IniciarSesion'
import Metas from '@/pages/Metas'
import Otros from '@/pages/Otros'
import Registro from '@/pages/Registro'
import Antojos from '@/pages/otros/Antojos'
import Informe from '@/pages/otros/Informe'
import Recordatorios from '@/pages/otros/Recordatorios'
import Actualiza from '@/pages/presupuesto/Actualiza'
import Distribuir from '@/pages/presupuesto/Distribuir'
import LayoutPresupuesto from '@/pages/presupuesto/LayoutPresupuesto'
import Revisa from '@/pages/presupuesto/Revisa'

/**
 * Rutas de la aplicación.
 *
 *   /entrar, /registro          públicas (redirigen a la app si ya hay sesión)
 *   /metas, /bolsillos, /otros  las 3 pestañas de la barra inferior
 *   /presupuesto/*              vista con sus 3 sub-pestañas, se entra desde
 *                               Bolsillos
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route element={<RutaPublica />}>
          <Route path="/entrar" element={<IniciarSesion />} />
          <Route path="/registro" element={<Registro />} />
        </Route>

        {/* Protegidas, dentro del layout con cabecera y barra inferior */}
        <Route element={<RutaProtegida />}>
          <Route element={<LayoutApp />}>
            {/* La app abre en Metas, la primera pestaña. */}
            <Route index element={<Navigate to="/metas" replace />} />

            <Route path="/metas" element={<Metas />} />
            <Route path="/bolsillos" element={<Bolsillos />} />
            <Route path="/otros" element={<Otros />} />
            <Route path="/otros/antojos" element={<Antojos />} />
            <Route path="/otros/recordatorios" element={<Recordatorios />} />
            <Route path="/otros/informe" element={<Informe />} />

            <Route path="/presupuesto" element={<LayoutPresupuesto />}>
              <Route index element={<Navigate to="actualiza" replace />} />
              <Route path="actualiza" element={<Actualiza />} />
              <Route path="revisa" element={<Revisa />} />
              <Route path="distribuir" element={<Distribuir />} />
            </Route>
          </Route>
        </Route>

        {/* Cualquier otra ruta vuelve al inicio. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
