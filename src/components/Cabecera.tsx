import { Link } from 'react-router-dom'

import { BotonTema } from '@/components/BotonTema'
import { InstalarApp } from '@/components/InstalarApp'
import { MenuUsuario } from '@/components/MenuUsuario'
import { ANCHO_CONTENIDO_APP } from '@/lib/layout'

/**
 * Cabecera fija de la app: logo, cambio de tema, instalar como PWA y menú de
 * la cuenta.
 */
export function Cabecera() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div
        className={`mx-auto flex h-16 w-full ${ANCHO_CONTENIDO_APP} items-center justify-between gap-2 px-4 sm:px-6`}
      >
        <Link to="/" className="flex items-center gap-2.5 rounded-card" aria-label="Ir al inicio">
          <img src="/monea-96x96.png" alt="" className="size-8" />
          <span className="font-display text-lg font-semibold tracking-tight text-text">
            Monea
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <InstalarApp />
          <BotonTema />
          <MenuUsuario />
        </div>
      </div>
    </header>
  )
}
