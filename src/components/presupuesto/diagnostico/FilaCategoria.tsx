import { calcularHolguraCategoria } from '@/lib/diagnostico'
import { formatearCOP, formatearPorcentaje } from '@/lib/formato'
import type { Categoria } from '@/types/basedatos'

import { BarraProgreso } from './BarraProgreso'

/**
 * Una fila del detalle por categoría: punto + nombre, "ideal X% / vas en Y%",
 * el monto mensual, un chip de holgura (o "entre más, mejor" para Ahorro) y
 * su barra de progreso frente a los ingresos.
 */
interface Props {
  categoria: Categoria
  real: number
  ingresos: number
}

export function FilaCategoria({ categoria, real, ingresos }: Props) {
  const { diferencia, tipo } = calcularHolguraCategoria(categoria, real, ingresos)

  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden className="size-2.5 shrink-0 rounded-pill" style={{ backgroundColor: categoria.color }} />
        <span className="font-semibold text-text">{categoria.nombre}</span>
        <span className="text-xs text-muted">ideal {formatearPorcentaje(categoria.porcentaje_ideal / 100)}</span>
        <span className="text-xs font-semibold" style={{ color: categoria.color }}>
          vas en {formatearPorcentaje(real / ingresos)}
        </span>
        <span className="cifra ml-auto shrink-0 font-semibold wrap-break-word text-text">{formatearCOP(real)}</span>
      </div>

      <BarraProgreso fraccion={real / ingresos} color={categoria.color} />

      <div className="flex justify-end">
        {tipo === 'entre-mas-mejor' ? (
          <span className="cifra rounded-pill bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
            Entre más, mejor
          </span>
        ) : tipo === 'holgura' ? (
          <span className="cifra rounded-pill bg-positive-soft px-2.5 py-1 text-xs font-semibold text-positive">
            +{formatearCOP(diferencia)}
          </span>
        ) : (
          <span className="cifra rounded-pill bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
            −{formatearCOP(Math.abs(diferencia))}
          </span>
        )}
      </div>
    </div>
  )
}
