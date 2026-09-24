import { useId } from 'react'

/** Interruptor on/off con etiqueta, para preferencias tipo "Avisarme". */
interface Props {
  etiqueta: string
  descripcion?: string
  activo: boolean
  onCambio: (activo: boolean) => void
}

export function Interruptor({ etiqueta, descripcion, activo, onCambio }: Props) {
  const id = useId()

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-text">
          {etiqueta}
        </label>
        {descripcion && <p className="text-xs text-muted">{descripcion}</p>}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={activo}
        onClick={() => onCambio(!activo)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition-colors',
          activo ? 'bg-accent-fill' : 'border border-border bg-surface-2',
        ].join(' ')}
      >
        <span
          aria-hidden
          className={[
            'inline-block size-4.5 transform rounded-pill bg-surface shadow-card transition-transform',
            activo ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
    </div>
  )
}
