import type { ButtonHTMLAttributes } from 'react'

import { IconoCargando } from './iconos'

/**
 * Botón base de la app. Todas las variantes salen de design tokens, así que
 * responden solos al cambio de tema.
 */

type Variante = 'principal' | 'secundario' | 'texto' | 'peligro'
type Tamano = 'sm' | 'md' | 'lg'

const VARIANTES: Record<Variante, string> = {
  principal: 'bg-accent-fill text-on-accent hover:opacity-90 active:opacity-80',
  secundario: 'border border-border bg-surface text-text hover:bg-surface-2',
  texto: 'text-muted hover:bg-surface-2 hover:text-text',
  peligro: 'text-danger hover:bg-danger-soft',
}

const TAMANOS: Record<Tamano, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamano?: Tamano
  /** Muestra un spinner y bloquea el botón mientras dura una operación. */
  cargando?: boolean
  anchoCompleto?: boolean
}

export function Boton({
  variante = 'principal',
  tamano = 'md',
  cargando = false,
  anchoCompleto = false,
  className = '',
  disabled,
  children,
  ...props
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-card font-semibold',
        'transition-all disabled:pointer-events-none disabled:opacity-50',
        VARIANTES[variante],
        TAMANOS[tamano],
        anchoCompleto ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {cargando && <IconoCargando className="size-4 animate-spin" />}
      {children}
    </button>
  )
}
