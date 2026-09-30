import { formatearMesAnio } from '@/lib/formato'
import { desplazarPeriodo, esPeriodoFuturo } from '@/lib/seguimiento'

/**
 * Navegación entre meses: ‹ mes anterior | mes actual | mes siguiente ›.
 *
 * Se puede retroceder sin límite (el historial) y avanzar hasta un mes futuro,
 * que se verá vacío y sin poder marcarse. Queda deshabilitado mientras carga
 * para no encadenar peticiones si el usuario repite clic.
 */
interface Props {
  anio: number
  mes: number
  cargando: boolean
  onCambiar: (anio: number, mes: number) => void
}

export function SelectorMes({ anio, mes, cargando, onCambiar }: Props) {
  const anterior = desplazarPeriodo(anio, mes, -1)
  const siguiente = desplazarPeriodo(anio, mes, 1)

  // Se permite ver UN mes por delante del actual, no más: navegar a un futuro
  // lejano no aporta nada porque nunca va a tener datos.
  const bloquearSiguiente = esPeriodoFuturo(siguiente.anio, siguiente.mes)

  return (
    <div className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface p-2">
      <button
        type="button"
        disabled={cargando}
        onClick={() => onCambiar(anterior.anio, anterior.mes)}
        aria-label={`Ver ${formatearMesAnio(anterior.anio, anterior.mes)}`}
        className="grid size-10 place-items-center rounded-pill text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:pointer-events-none disabled:opacity-40"
      >
        ‹
      </button>

      <p className="font-display text-base font-bold text-text first-letter:uppercase" aria-live="polite">
        {formatearMesAnio(anio, mes)}
      </p>

      <button
        type="button"
        disabled={cargando || bloquearSiguiente}
        onClick={() => onCambiar(siguiente.anio, siguiente.mes)}
        aria-label={`Ver ${formatearMesAnio(siguiente.anio, siguiente.mes)}`}
        className="grid size-10 place-items-center rounded-pill text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:pointer-events-none disabled:opacity-40"
      >
        ›
      </button>
    </div>
  )
}
