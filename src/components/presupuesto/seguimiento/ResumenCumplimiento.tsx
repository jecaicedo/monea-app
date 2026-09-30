import type { Cumplimiento } from '@/lib/seguimiento'

import { PorcentajeCumplimiento } from './PorcentajeCumplimiento'

/**
 * Resumen del mes: el % de cumplimiento y, siempre al lado, el conteo de lo
 * marcado. Sin ese conteo, el 0% inevitable del día 1 se leería como un
 * fracaso en vez de "todavía no has marcado nada".
 */
interface Props {
  cumplimiento: Cumplimiento
}

export function ResumenCumplimiento({ cumplimiento }: Props) {
  const { cumplidos, noCumplidos, pendientes, total, fraccion } = cumplimiento
  const marcados = cumplidos + noCumplidos

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4">
      <div>
        <p className="font-display text-sm font-semibold tracking-wide text-muted uppercase">Cumplimiento</p>
        <p className="mt-1 text-sm text-muted">
          {marcados} de {total} marcados
        </p>
      </div>

      <div className="text-right">
        <p>
          <PorcentajeCumplimiento fraccion={fraccion} className="text-3xl font-bold" />
        </p>
        <p className="mt-1 text-xs text-muted">
          {cumplidos} cumplidos · {noCumplidos} no · {pendientes} pendientes
        </p>
      </div>
    </div>
  )
}
