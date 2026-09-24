import type { Bolsillo, Categoria, Concepto } from '@/types/basedatos'

import { BannerEstado } from './BannerEstado'
import { ComoUsasIngresos } from './ComoUsasIngresos'
import { DetallePorCategoria } from './DetallePorCategoria'

/**
 * Tablero de diagnóstico: modo solo lectura de "Revisa". Todos los números
 * salen de los mismos stores que el editor (ingresos y presupuesto), así que
 * cualquier cambio hecho en modo edición se refleja aquí sin recargar nada.
 *
 * Las 4 tarjetas métricas (Ingresos/Gastos/Ahorro/Excedente) no se repiten
 * aquí: ya las muestra la barra de resumen superior, visible en ambos modos.
 */
interface Props {
  categorias: Categoria[]
  bolsillos: Bolsillo[]
  conceptosPorBolsillo: Record<string, Concepto[]>
  totalesPorCategoria: Record<string, number>
  totalIngresos: number
  totalGastos: number
  totalAhorro: number
}

export function TableroDiagnostico({
  categorias,
  bolsillos,
  conceptosPorBolsillo,
  totalesPorCategoria,
  totalIngresos,
  totalGastos,
  totalAhorro,
}: Props) {
  if (totalIngresos <= 0) {
    return (
      <p className="rounded-card border border-border bg-surface p-6 text-center text-sm text-muted">
        Agrega un ingreso en la pestaña <span className="font-semibold text-text">Actualiza</span> para ver tu
        diagnóstico.
      </p>
    )
  }

  if (bolsillos.length === 0) {
    return (
      <p className="rounded-card border border-border bg-surface p-6 text-center text-sm text-muted">
        Todavía no tienes bolsillos ni conceptos. Cambia a modo{' '}
        <span className="font-semibold text-text">Editar</span> para agregarlos.
      </p>
    )
  }

  const excedente = totalIngresos - totalGastos - totalAhorro

  return (
    <div className="flex flex-col gap-5">
      <ComoUsasIngresos ingresos={totalIngresos} gastos={totalGastos} ahorro={totalAhorro} excedente={excedente} />

      <BannerEstado excedente={excedente} ahorro={totalAhorro} />

      <DetallePorCategoria
        categorias={categorias}
        bolsillos={bolsillos}
        conceptosPorBolsillo={conceptosPorBolsillo}
        totalesPorCategoria={totalesPorCategoria}
        ingresos={totalIngresos}
      />
    </div>
  )
}
