import { SLUG_AHORRO } from '@/stores/presupuesto'
import type { CategoriaSlug, SeguimientoMensual } from '@/types/basedatos'

/**
 * Fórmulas de PRESENTACIÓN de "Mes a mes" y de la racha que se muestra en
 * Metas. Son puras: no tocan el store ni Supabase, y no participan en ningún
 * cálculo del presupuesto proyectado (Revisa, diagnóstico, metas), que siguen
 * leyendo solo `conceptos`.
 */

/**
 * Lo mínimo que hace falta de un registro para medir cumplimiento. La consulta
 * del historial trae solo estas tres columnas: pedir montos y notas de 12 meses
 * sería mover mucho dato para no usarlo.
 */
export type ResumenMes = Pick<SeguimientoMensual, 'anio' | 'mes' | 'cumplido'>

/** Año y mes (1-12) de hoy, en hora local. */
export function periodoActual(): { anio: number; mes: number } {
  const hoy = new Date()
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 }
}

/** Corre un periodo `paso` meses (puede ser negativo), ajustando el año. */
export function desplazarPeriodo(anio: number, mes: number, paso: number): { anio: number; mes: number } {
  const fecha = new Date(anio, mes - 1 + paso, 1)
  return { anio: fecha.getFullYear(), mes: fecha.getMonth() + 1 }
}

/** Compara dos periodos: negativo si a < b, 0 si son el mismo, positivo si a > b. */
export function compararPeriodos(a: { anio: number; mes: number }, b: { anio: number; mes: number }): number {
  return a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes
}

/** Un periodo posterior al mes en curso: se puede ver, pero no se marca nada. */
export function esPeriodoFuturo(anio: number, mes: number): boolean {
  return compararPeriodos({ anio, mes }, periodoActual()) > 0
}

/** El mes en curso: el único en el que se crean filas de seguimiento. */
export function esPeriodoEnCurso(anio: number, mes: number): boolean {
  return compararPeriodos({ anio, mes }, periodoActual()) === 0
}

/** Clave estable de un periodo para indexarlo: (2026, 9) -> "2026-09". */
export function clavePeriodo(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}`
}

/**
 * El último mes CERRADO, es decir el anterior al que está en curso. Un mes solo
 * se puede juzgar cuando terminó: mientras corre, lo que falta por marcar
 * todavía no es un incumplimiento.
 */
export function ultimoMesCerrado(): { anio: number; mes: number } {
  const { anio, mes } = periodoActual()
  return desplazarPeriodo(anio, mes, -1)
}

/* -------------------------------------------------------------------------- */
/* Cumplimiento del mes                                                       */
/* -------------------------------------------------------------------------- */

export interface Cumplimiento {
  cumplidos: number
  noCumplidos: number
  pendientes: number
  total: number
  /** Fracción 0-1 sobre el TOTAL, no solo sobre los ya marcados. */
  fraccion: number
}

/**
 * Los pendientes cuentan en el denominador a propósito: el porcentaje mide
 * cuánto del mes ya está cumplido, no qué tan bien va lo que se marcó. Por eso
 * la pantalla siempre lo acompaña del conteo "X de Y marcados", si no un 0% el
 * día 1 se leería como fracaso en vez de "todavía no has marcado nada".
 */
export function calcularCumplimiento(registros: Pick<SeguimientoMensual, 'cumplido'>[]): Cumplimiento {
  const cumplidos = registros.filter((r) => r.cumplido === true).length
  const noCumplidos = registros.filter((r) => r.cumplido === false).length
  const total = registros.length

  return {
    cumplidos,
    noCumplidos,
    pendientes: total - cumplidos - noCumplidos,
    total,
    fraccion: total > 0 ? cumplidos / total : 0,
  }
}

/**
 * A partir de aquí un mes cuenta como cumplido. Es el MISMO número que pinta
 * el resumen en verde y que suma un mes a la racha: existe una sola vez a
 * propósito, para que las dos pantallas nunca puedan discrepar.
 */
export const UMBRAL_MES_CUMPLIDO = 0.8

export type NivelCumplimiento = 'alto' | 'medio' | 'bajo'

/** Umbrales del resumen: >=80% alto, 50-79% medio, <50% bajo. */
export function nivelCumplimiento(fraccion: number): NivelCumplimiento {
  if (fraccion >= UMBRAL_MES_CUMPLIDO) return 'alto'
  if (fraccion >= 0.5) return 'medio'
  return 'bajo'
}

/* -------------------------------------------------------------------------- */
/* Racha de meses cumplidos                                                   */
/* -------------------------------------------------------------------------- */

/** Hasta dónde se mira hacia atrás. Más allá no aporta y encarece la consulta. */
export const MAX_MESES_RACHA = 12

/**
 * Meses CERRADOS consecutivos que alcanzaron el umbral, contados hacia atrás
 * desde el último mes cerrado.
 *
 * El mes en curso nunca entra: sus conceptos sin marcar todavía no son
 * incumplimientos, así que incluirlo rompería la racha todos los días 1. Se
 * muestra aparte como "vas en X% este mes".
 *
 * Corta en el primer mes que no llegue al umbral y también en el primero que
 * no tenga registros: un mes sin datos no es un mes cumplido, pero tampoco se
 * trata como fracaso — simplemente ahí termina lo que se puede afirmar.
 */
export function calcularRacha(
  cumplimientoPorMes: Map<string, Cumplimiento>,
  maxMeses = MAX_MESES_RACHA,
): number {
  let racha = 0
  let periodo = ultimoMesCerrado()

  for (let i = 0; i < maxMeses; i++) {
    const cumplimiento = cumplimientoPorMes.get(clavePeriodo(periodo.anio, periodo.mes))
    if (!cumplimiento || cumplimiento.total === 0) break
    if (cumplimiento.fraccion < UMBRAL_MES_CUMPLIDO) break

    racha++
    periodo = desplazarPeriodo(periodo.anio, periodo.mes, -1)
  }

  return racha
}

/**
 * Agrupa registros de varios meses en el cumplimiento de cada uno, indexado
 * por `clavePeriodo`. Reutiliza `calcularCumplimiento` para que el % de la
 * racha y el que muestra "Mes a mes" salgan de la misma fórmula.
 */
export function agruparCumplimientoPorMes(registros: ResumenMes[]): Map<string, Cumplimiento> {
  const porMes = new Map<string, ResumenMes[]>()
  for (const registro of registros) {
    const clave = clavePeriodo(registro.anio, registro.mes)
    const grupo = porMes.get(clave)
    if (grupo) grupo.push(registro)
    else porMes.set(clave, [registro])
  }

  return new Map([...porMes].map(([clave, grupo]) => [clave, calcularCumplimiento(grupo)]))
}

/* -------------------------------------------------------------------------- */
/* Pagado vs. presupuestado                                                   */
/* -------------------------------------------------------------------------- */

export type SentidoDiferencia = 'igual' | 'favorable' | 'desfavorable'

export interface Diferencia {
  /** pagado - presupuestado. Negativo = pagó menos de lo planeado. */
  monto: number
  sentido: SentidoDiferencia
}

/**
 * Compara lo pagado contra lo presupuestado. El SENTIDO se invierte según el
 * tipo de categoría: en un gasto, pagar de menos es bueno; en Ahorro con
 * propósito, guardar de menos es justo lo contrario.
 *
 * El texto que se muestra es neutro ("$X por debajo de lo presupuestado") y es
 * el color el que hace el juicio, así la misma frase sirve en ambos casos.
 */
export function evaluarDiferencia(
  montoPagado: number,
  montoPresupuestado: number,
  categoriaSlug: CategoriaSlug,
): Diferencia {
  const monto = montoPagado - montoPresupuestado
  if (monto === 0) return { monto, sentido: 'igual' }

  const esAhorro = categoriaSlug === SLUG_AHORRO
  const gastarDeMas = monto > 0

  return {
    monto,
    sentido: gastarDeMas === esAhorro ? 'favorable' : 'desfavorable',
  }
}
