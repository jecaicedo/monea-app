import { useId } from 'react'
import type { SelectHTMLAttributes } from 'react'

import { IconoFlechaAbajo } from './iconos'

/** Un <select> con el estilo de la app y una flecha propia (sin la nativa del navegador). */

interface Opcion {
  valor: string
  etiqueta: string
}

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  etiqueta: string
  opciones: Opcion[]
  placeholder?: string
  ayuda?: string
  ocultarEtiqueta?: boolean
}

export function Selector({
  etiqueta,
  opciones,
  placeholder,
  ayuda,
  ocultarEtiqueta = false,
  className = '',
  ...props
}: Props) {
  const id = useId()
  const idAyuda = `${id}-ayuda`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={ocultarEtiqueta ? 'sr-only' : 'text-sm font-medium text-text'}>
        {etiqueta}
      </label>

      <div className="relative">
        <select
          id={id}
          aria-describedby={ayuda ? idAyuda : undefined}
          className={[
            'h-11 w-full appearance-none rounded-card border border-border bg-surface-2 px-3.5 pr-9 text-base text-text',
            'transition-colors outline-none focus:border-accent',
            className,
          ].join(' ')}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {opciones.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
        <IconoFlechaAbajo className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
      </div>

      {ayuda && (
        <p id={idAyuda} className="text-xs text-muted">
          {ayuda}
        </p>
      )}
    </div>
  )
}
