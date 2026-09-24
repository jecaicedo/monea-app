import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { IconoCerrar } from './iconos'

/**
 * Modal centrado con overlay. Cierra con Escape, con clic en el fondo, o con
 * el botón de cerrar. Primitivo genérico: quien lo usa arma el contenido
 * (título propio, formulario, botones de acción).
 */
interface Props {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  descripcion?: string
  children: ReactNode
}

export function Modal({ abierto, onCerrar, titulo, descripcion, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return

    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPresionarTecla)

    // Bloquea el scroll del fondo mientras el modal está abierto.
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', alPresionarTecla)
      document.body.style.overflow = overflowPrevio
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-bg/60 backdrop-blur-sm sm:place-items-center"
      onMouseDown={(e) => {
        // Solo cierra si el clic empezó fuera del panel (no al arrastrar un
        // texto seleccionado desde dentro hacia afuera).
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        className="w-full max-w-md rounded-t-panel border border-border bg-surface p-6 shadow-card sm:rounded-panel"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-titulo" className="font-display text-lg font-bold text-text">
              {titulo}
            </h2>
            {descripcion && <p className="mt-1 text-sm text-muted">{descripcion}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid size-8 shrink-0 place-items-center rounded-pill text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <IconoCerrar className="size-4" />
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}
