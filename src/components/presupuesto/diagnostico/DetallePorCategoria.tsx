import { calcularGastosFijos } from '@/lib/diagnostico'
import { formatearCOP, formatearPorcentaje } from '@/lib/formato'
import type { Bolsillo, Categoria, Concepto } from '@/types/basedatos'

import { FilaCategoria } from './FilaCategoria'

/**
 * Detalle por categoría: primero el bloque combinado "Gastos fijos" (Hogar +
 * Necesidades básicas, el rubro más grande del presupuesto), luego una fila
 * por cada una de las 6 categorías.
 */
interface Props {
  categorias: Categoria[]
  bolsillos: Bolsillo[]
  conceptosPorBolsillo: Record<string, Concepto[]>
  totalesPorCategoria: Record<string, number>
  ingresos: number
}

export function DetallePorCategoria({
  categorias,
  bolsillos,
  conceptosPorBolsillo,
  totalesPorCategoria,
  ingresos,
}: Props) {
  const gastosFijos = calcularGastosFijos(categorias, bolsillos, conceptosPorBolsillo)

  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
      <h3 className="font-display text-sm font-semibold tracking-wide text-muted uppercase">Detalle por categoría</h3>

      <div className="rounded-card bg-surface-2 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-semibold text-text">Gastos fijos = Hogar + Necesidades básicas</p>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-text">{formatearPorcentaje(gastosFijos / ingresos)}</span>
            <span className="cifra font-semibold wrap-break-word text-text">{formatearCOP(gastosFijos)}</span>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted">Ideal 50-60%</p>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {categorias.map((categoria) => (
          <FilaCategoria
            key={categoria.id}
            categoria={categoria}
            real={totalesPorCategoria[categoria.id] ?? 0}
            ingresos={ingresos}
          />
        ))}
      </div>
    </div>
  )
}
