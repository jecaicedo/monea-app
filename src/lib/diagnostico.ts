import { calcularTotalCategoria } from '@/stores/presupuesto'
import type { Bolsillo, Categoria, CategoriaSlug, Concepto } from '@/types/basedatos'

/**
 * Fórmulas de PRESENTACIÓN para el tablero de diagnóstico de "Revisa"
 * (modo solo lectura). No calculan totales por sí mismas: se apoyan en las
 * funciones ya probadas de `stores/presupuesto.ts` (`calcularTotalCategoria`,
 * `calcularTotalGastos`, `calcularTotalAhorro`) para no duplicar esa lógica.
 */

export type EstadoPresupuesto = 'superavit' | 'equilibrio' | 'deficit'

/**
 * "Vas en superávit / equilibrio / déficit", con "con ahorro" si además
 * se está apartando algo de dinero para la categoría Ahorro con propósito.
 */
export function calcularEstadoPresupuesto(
  excedente: number,
  ahorro: number,
): { tipo: EstadoPresupuesto; etiqueta: string } {
  const tipo: EstadoPresupuesto = excedente > 0 ? 'superavit' : excedente < 0 ? 'deficit' : 'equilibrio'
  const base = tipo === 'superavit' ? 'Vas en superávit' : tipo === 'deficit' ? 'Vas en déficit' : 'Vas en equilibrio'
  return { tipo, etiqueta: ahorro > 0 ? `${base} con ahorro` : base }
}

export type TipoHolgura = 'entre-mas-mejor' | 'holgura' | 'exceso'

interface Holgura {
  /** Lo que "debería" costar esta categoría según su porcentaje ideal. */
  montoIdeal: number
  /** montoIdeal - real. Positivo = por debajo del ideal, negativo = por encima. */
  diferencia: number
  tipo: TipoHolgura
}

const SLUG_AHORRO: CategoriaSlug = 'ahorro-con-proposito'

/**
 * Holgura de una categoría frente a su ideal. Para "Ahorro con propósito" no
 * aplica la semántica verde/rojo (más ahorro nunca es malo), así que se
 * marca aparte con el tipo 'entre-mas-mejor'.
 */
export function calcularHolguraCategoria(categoria: Categoria, real: number, ingresos: number): Holgura {
  const montoIdeal = ingresos * (categoria.porcentaje_ideal / 100)
  const diferencia = montoIdeal - real

  if (categoria.slug === SLUG_AHORRO) {
    return { montoIdeal, diferencia, tipo: 'entre-mas-mejor' }
  }
  return { montoIdeal, diferencia, tipo: diferencia >= 0 ? 'holgura' : 'exceso' }
}

const SLUGS_GASTOS_FIJOS: CategoriaSlug[] = ['gastos-del-hogar', 'necesidades-basicas']

/** Gastos fijos = Hogar + Necesidades básicas (el bloque más grande del presupuesto). */
export function calcularGastosFijos(
  categorias: Categoria[],
  bolsillos: Bolsillo[],
  conceptosPorBolsillo: Record<string, Concepto[]>,
): number {
  return categorias
    .filter((categoria) => SLUGS_GASTOS_FIJOS.includes(categoria.slug))
    .reduce((suma, categoria) => suma + calcularTotalCategoria(categoria.id, bolsillos, conceptosPorBolsillo), 0)
}
