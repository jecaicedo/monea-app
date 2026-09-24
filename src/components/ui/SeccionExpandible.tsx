import type { ReactNode } from 'react'

import { Acordeon } from './Acordeon'
import { IconoFlechaAbajo } from './iconos'

/**
 * Bloque plegable con encabezado clicable: título, subtítulo opcional y una
 * flecha que rota al abrir. Es un uso concreto del primitivo Acordeon, para
 * las sub-secciones dentro de una tarjeta (Deducciones, Descuentos…).
 */
interface Props {
  titulo: string
  subtitulo?: string
  abierta: boolean
  onAlternar: () => void
  children: ReactNode
}

export function SeccionExpandible({ titulo, subtitulo, abierta, onAlternar, children }: Props) {
  return (
    <div className="rounded-card border border-border">
      <Acordeon
        abierta={abierta}
        claseCuerpo="border-t border-border p-4"
        encabezado={
          <button
            type="button"
            onClick={onAlternar}
            aria-expanded={abierta}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-text">{titulo}</span>
              {subtitulo && <span className="block truncate text-xs text-muted">{subtitulo}</span>}
            </span>
            <IconoFlechaAbajo
              className={`size-4 shrink-0 text-muted transition-transform ${abierta ? 'rotate-180' : ''}`}
            />
          </button>
        }
      >
        {children}
      </Acordeon>
    </div>
  )
}
