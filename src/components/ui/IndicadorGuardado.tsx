import { useEffect, useRef, useState } from 'react'

import { IconoCargando, IconoCheck } from './iconos'

/**
 * Indicador sutil de autosave: "Guardando…" mientras hay una escritura
 * pendiente o en curso, y un "Guardado" que aparece un momento cuando termina.
 * No muestra nada en reposo (evita ruido visual constante en un formulario
 * con muchas filas).
 */
export function IndicadorGuardado({ guardando }: { guardando: boolean }) {
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const estabaGuardando = useRef(false)

  useEffect(() => {
    if (estabaGuardando.current && !guardando) {
      setMostrarConfirmacion(true)
      const temporizador = setTimeout(() => setMostrarConfirmacion(false), 1800)
      estabaGuardando.current = guardando
      return () => clearTimeout(temporizador)
    }
    estabaGuardando.current = guardando
  }, [guardando])

  if (guardando) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted" role="status">
        <IconoCargando className="size-3.5" />
        Guardando…
      </span>
    )
  }

  if (mostrarConfirmacion) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-positive" role="status">
        <IconoCheck className="size-3.5" />
        Guardado
      </span>
    )
  }

  return null
}
