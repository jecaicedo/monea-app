import { IconoCerrar, IconoCheck } from '@/components/ui/iconos'

/**
 * Control de tres posiciones: pendiente / cumplido / no cumplido.
 *
 * Es un radiogroup y no tres botones sueltos, para que el lector de pantalla
 * anuncie el conjunto y la selección. "Pendiente" es una posición explícita
 * (no la ausencia de las otras dos) para poder deshacer una marca.
 */
interface Props {
  /** null = pendiente. */
  valor: boolean | null
  onCambiar: (valor: boolean | null) => void
  /** Nombre del concepto, para las etiquetas accesibles. */
  concepto: string
  disabled?: boolean
}

const BASE = 'grid size-9 place-items-center rounded-pill border transition-colors disabled:pointer-events-none disabled:opacity-40'

export function ControlEstado({ valor, onCambiar, concepto, disabled = false }: Props) {
  return (
    <div role="radiogroup" aria-label={`Estado de ${concepto}`} className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        role="radio"
        aria-checked={valor === null}
        aria-label="Pendiente"
        title="Pendiente"
        disabled={disabled}
        onClick={() => onCambiar(null)}
        className={[
          BASE,
          valor === null ? 'border-border bg-surface-2 text-text' : 'border-transparent text-muted hover:bg-surface-2',
        ].join(' ')}
      >
        <span aria-hidden className="size-2 rounded-pill bg-current" />
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={valor === true}
        aria-label="Cumplido"
        title="Cumplido"
        disabled={disabled}
        onClick={() => onCambiar(true)}
        className={[
          BASE,
          valor === true
            ? 'border-transparent bg-positive-soft text-positive'
            : 'border-transparent text-muted hover:bg-surface-2',
        ].join(' ')}
      >
        <IconoCheck className="size-4" />
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={valor === false}
        aria-label="No cumplido"
        title="No cumplido"
        disabled={disabled}
        onClick={() => onCambiar(false)}
        className={[
          BASE,
          valor === false
            ? 'border-transparent bg-danger-soft text-danger'
            : 'border-transparent text-muted hover:bg-surface-2',
        ].join(' ')}
      >
        <IconoCerrar className="size-4" />
      </button>
    </div>
  )
}
