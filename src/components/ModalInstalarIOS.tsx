import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { IconoAgregarPantalla, IconoCerrar, IconoCompartir, IconoFlechaAbajo } from '@/components/ui/iconos'

/**
 * Modal de instrucciones para instalar la PWA en iOS/Safari, que no dispara
 * `beforeinstallprompt` (Apple no lo soporta): la única forma de "instalar"
 * ahí es manual, vía Compartir → Agregar a inicio.
 *
 * No reutiliza el `Modal` genérico: ese primitivo pone título+descripción
 * junto al botón de cerrar en una sola fila, y este diseño necesita el ícono
 * arriba a la izquierda + la X arriba a la derecha, con el título grande
 * DEBAJO de esa fila — un layout distinto. Por eso se arma su propio overlay,
 * calcado del mismo patrón (fondo atenuado, cierra con Escape o clic afuera,
 * bloquea el scroll) para que se sienta igual de consistente que el resto.
 *
 * Siempre se abre como hoja inferior (no se centra en pantallas grandes, a
 * diferencia del `Modal` genérico): tiene sentido de sobra en su único
 * contexto real, un iPhone, y encima deja apuntar la flecha del pie hacia la
 * barra de Safari de verdad, justo debajo.
 */
interface Props {
  abierto: boolean
  onCerrar: () => void
}

/** Un paso destaca una opción del menú de Safari con una píldora de acento. */
function Pildora({ children }: { children: ReactNode }) {
  return (
    <span className="mx-1 inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2 py-0.5 align-middle text-sm font-semibold text-accent">
      {children}
    </span>
  )
}

function Paso({ numero, children }: { numero: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-pill bg-accent-soft text-sm font-bold text-accent">
        {numero}
      </span>
      <p className="pt-0.5 text-sm text-text">{children}</p>
    </li>
  )
}

export function ModalInstalarIOS({ abierto, onCerrar }: Props) {
  // `montado` mantiene el nodo en el DOM mientras dura la animación de
  // salida; `visible` es lo que realmente dispara la transición CSS (entra en
  // true un frame después de montar, para que el navegador alcance a pintar
  // el estado inicial antes de animar hacia el final — si no, no hay transición).
  const [montado, setMontado] = useState(abierto)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (abierto) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setMontado(true)
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
    setVisible(false)
  }, [abierto])

  useEffect(() => {
    if (!montado) return

    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPresionarTecla)

    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', alPresionarTecla)
      document.body.style.overflow = overflowPrevio
    }
  }, [montado, onCerrar])

  if (!montado) return null

  return (
    <div
      className={`fixed inset-0 z-50 grid place-items-end bg-bg/60 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="instalar-ios-titulo"
        // Efecto de apertura tipo "abrir una app": entra deslizándose desde
        // abajo con un ligero acercamiento (scale) y un remate suave (ease-out
        // con un poco de rebote), en vez de aparecer de golpe.
        className={`w-full max-w-md rounded-t-panel border border-border bg-surface p-6 shadow-card transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-95 opacity-0'
        }`}
        onTransitionEnd={() => {
          if (!visible) setMontado(false)
        }}
      >
        <div className="mb-5 flex items-start justify-between">
          <span className="grid size-11 place-items-center rounded-card bg-accent-soft text-accent">
            <IconoCompartir className="size-5" />
          </span>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid size-8 shrink-0 place-items-center rounded-pill text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <IconoCerrar className="size-4" />
          </button>
        </div>

        <h2 id="instalar-ios-titulo" className="font-display text-xl font-bold text-text">
          Instala Monea en tu iPhone
        </h2>
        <p className="mt-1 text-sm text-muted">Tenla como una app, a un solo toque. Toma 5 segundos:</p>

        <ol className="mt-6 flex flex-col gap-4">
          <Paso numero={1}>
            Toca el botón
            <Pildora>
              <IconoCompartir className="size-3.5" />
              Compartir
            </Pildora>
            (en la barra de abajo).
          </Paso>
          <Paso numero={2}>
            Baja y elige
            <Pildora>
              <IconoAgregarPantalla className="size-3.5" />
              Agregar a inicio
            </Pildora>
            .
          </Paso>
          <Paso numero={3}>
            Toca <strong className="font-semibold">Agregar</strong> y abre Monea desde tu pantalla de inicio.
          </Paso>
        </ol>

        <div className="mt-6 flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-medium text-muted">El botón Compartir está aquí abajo</p>
          <IconoFlechaAbajo className="size-6 animate-bounce text-accent" />
        </div>
      </div>
    </div>
  )
}
