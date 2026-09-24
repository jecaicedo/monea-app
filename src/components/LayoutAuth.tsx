import type { ReactNode } from 'react'

import { IconoAlerta } from '@/components/ui/iconos'

/**
 * Marco compartido por las pantallas de inicio de sesión y registro:
 * tarjeta centrada, logo arriba y espacio para el formulario.
 */

interface Props {
  titulo: string
  descripcion: string
  error?: string | null
  children: ReactNode
  /** Enlace del pie, ej. "¿No tienes cuenta? Regístrate". */
  pie: ReactNode
}

export function LayoutAuth({ titulo, descripcion, error, children, pie }: Props) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src="/monea-96x96.png" alt="" className="size-14" />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-text">{titulo}</h1>
            <p className="mt-1 text-sm text-muted">{descripcion}</p>
          </div>
        </div>

        <div className="rounded-panel border border-border bg-surface p-6 shadow-card">
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-card bg-danger-soft p-3 text-sm text-danger"
            >
              <IconoAlerta className="mt-px size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {children}
        </div>

        <p className="mt-6 text-center text-sm text-muted">{pie}</p>
      </div>
    </div>
  )
}
