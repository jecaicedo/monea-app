import { useId, useState } from 'react'
import type { InputHTMLAttributes } from 'react'

import { IconoOjo, IconoOjoTachado } from './iconos'

/**
 * Campo de formulario con etiqueta, texto de ayuda y mensaje de error.
 * Si el tipo es "password" agrega el botón de mostrar/ocultar.
 */

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  etiqueta: string
  error?: string
  ayuda?: string
}

export function CampoTexto({ etiqueta, error, ayuda, type = 'text', className = '', ...props }: Props) {
  const id = useId()
  const idAyuda = `${id}-ayuda`
  const [visible, setVisible] = useState(false)

  const esContrasena = type === 'password'
  const tipoEfectivo = esContrasena && visible ? 'text' : type

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {etiqueta}
      </label>

      <div className="relative">
        <input
          id={id}
          type={tipoEfectivo}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || ayuda ? idAyuda : undefined}
          className={[
            'h-11 w-full rounded-card border bg-surface-2 px-3.5 text-base text-text',
            'placeholder:text-muted',
            'transition-colors outline-none',
            'focus:border-accent',
            error ? 'border-danger' : 'border-border',
            esContrasena ? 'pr-11' : '',
            className,
          ].join(' ')}
          {...props}
        />

        {esContrasena && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-card text-muted transition-colors hover:text-text"
          >
            {visible ? <IconoOjoTachado /> : <IconoOjo />}
          </button>
        )}
      </div>

      {(error || ayuda) && (
        <p id={idAyuda} className={`text-xs ${error ? 'text-danger' : 'text-muted'}`}>
          {error ?? ayuda}
        </p>
      )}
    </div>
  )
}
