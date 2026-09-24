import { Outlet } from 'react-router-dom'

import { BarraInferior } from '@/components/BarraInferior'
import { Cabecera } from '@/components/Cabecera'
import { ANCHO_CONTENIDO_APP } from '@/lib/layout'

/**
 * Layout de la aplicación con sesión iniciada: cabecera fija arriba, contenido
 * en el centro y barra de navegación abajo.
 *
 * El contenido va en una columna centrada de ancho máximo (ver
 * ANCHO_CONTENIDO_APP) para que en escritorio respire sin volverse una sábana
 * de lado a lado, y lleva relleno inferior suficiente para que la barra
 * flotante nunca tape la última tarjeta.
 */
export function LayoutApp() {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <Cabecera />

      <main className={`mx-auto w-full ${ANCHO_CONTENIDO_APP} px-4 pt-6 pb-32 sm:px-6 sm:pb-28`}>
        <Outlet />
      </main>

      <BarraInferior />
    </div>
  )
}
