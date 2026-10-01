import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { IconoCerrar } from './iconos'

/**
 * Modal centrado con overlay. Cierra con Escape, con clic en el fondo, o con
 * el botón de cerrar. Primitivo genérico: quien lo usa arma el contenido
 * (título propio, formulario, botones de acción).
 *
 * El panel nunca pasa del alto de la pantalla: el encabezado queda fijo y es
 * el cuerpo el que se desplaza. Por eso el padding vive en el encabezado y en
 * el cuerpo y no en el panel — así la barra de scroll queda pegada al borde y
 * el título no se va con el contenido. Quien use este modal NO necesita poner
 * su propio `max-h` ni `overflow-y-auto`.
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
      className="fixed inset-0 z-50 grid place-items-end bg-bg/60 backdrop-blur-sm sm:place-items-center sm:p-4"
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
        className="flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-panel border border-border bg-surface shadow-card sm:rounded-panel"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 p-6 pb-4">
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

        {/* min-h-0 es lo que permite que un hijo de flex se encoja por debajo
            de su contenido; sin eso el overflow nunca se activa. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6">{children}</div>
      </div>
    </div>
  )
}
