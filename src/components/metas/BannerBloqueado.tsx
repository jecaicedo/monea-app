import type { ReactNode } from 'react'

import { IconoCandado } from '@/components/ui/iconos'

/**
 * Banner de etapa bloqueada: candado + mensaje guía. Se reutiliza tanto en
 * el Fondo de emergencia (bloqueado por déficit) como en Metas (bloqueada
 * por déficit o por fondo incompleto) — el mensaje y la acción los decide
 * quien lo usa, el banner solo pone la forma.
 */
interface Props {
  mensaje: string
  children?: ReactNode
}

export function BannerBloqueado({ mensaje, children }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-card border border-border bg-surface-2 p-4">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-muted">
        <IconoCandado className="size-4" />
      </span>
      <div className="flex flex-col items-start gap-1.5">
        <p className="text-sm font-medium text-text">{mensaje}</p>
        {children}
      </div>
    </div>
  )
}
