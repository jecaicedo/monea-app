import type { Recurrencia } from '@/types/basedatos'

/**
 * "En cuánto tiempo" de un recordatorio: proximidad y próxima ocurrencia.
 *
 * Sin recurrencia (`null`, "una vez") la ocurrencia es la fecha guardada tal
 * cual, así que SÍ puede quedar en el pasado ("vencido"). Con recurrencia se
 * avanza desde la fecha base hasta encontrar la primera ocurrencia de hoy en
 * adelante — por construcción, un recordatorio recurrente nunca queda
 * vencido, solo se le calcula su próxima fecha en vivo (no se generan filas
 * futuras en la base de datos).
 */

const MS_POR_DIA = 24 * 60 * 60 * 1000

function iniciarDia(fecha: Date): Date {
  const copia = new Date(fecha)
  copia.setHours(0, 0, 0, 0)
  return copia
}

/** Suma meses con clamp de día (31 de enero + 1 mes -> 28/29 de febrero, no marzo). */
function sumarMeses(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha)
  const diaOriginal = resultado.getDate()
  resultado.setDate(1)
  resultado.setMonth(resultado.getMonth() + meses)
  const ultimoDiaDelMes = new Date(resultado.getFullYear(), resultado.getMonth() + 1, 0).getDate()
  resultado.setDate(Math.min(diaOriginal, ultimoDiaDelMes))
  return resultado
}

const DIAS_POR_RECURRENCIA: Partial<Record<Recurrencia, number>> = {
  diaria: 1,
  semanal: 7,
  quincenal: 15,
}
const MESES_POR_RECURRENCIA: Partial<Record<Recurrencia, number>> = {
  mensual: 1,
  bimestral: 2,
  trimestral: 3,
  semestral: 6,
  anual: 12,
}

export interface ProximaOcurrencia {
  fecha: Date
  /** Días desde hoy hasta la ocurrencia. Negativo = ya pasó. */
  diasHasta: number
}

/**
 * `fechaBaseIso` viene de una columna `date` de Postgres ('YYYY-MM-DD'): se
 * parsea a mano en vez de `new Date(iso)` para que se interprete en la zona
 * horaria local del navegador, no en UTC (si no, el día se puede correr uno
 * según el huso).
 */
export function calcularProximaOcurrencia(
  fechaBaseIso: string,
  recurrencia: Recurrencia | null,
  hoy: Date = new Date(),
): ProximaOcurrencia {
  const hoyInicio = iniciarDia(hoy)
  const [anio, mes, dia] = fechaBaseIso.split('-').map(Number)
  let fecha = new Date(anio, mes - 1, dia)

  const diasPaso = recurrencia ? DIAS_POR_RECURRENCIA[recurrencia] : undefined
  const mesesPaso = recurrencia ? MESES_POR_RECURRENCIA[recurrencia] : undefined

  if (diasPaso || mesesPaso) {
    while (fecha.getTime() < hoyInicio.getTime()) {
      fecha = diasPaso ? new Date(fecha.getTime() + diasPaso * MS_POR_DIA) : sumarMeses(fecha, mesesPaso!)
    }
  }
  // Sin recurrencia, o una recurrencia que el CHECK del backend permite pero
  // esta pantalla no expone: se deja la fecha tal cual, sin repetir.

  const diasHasta = Math.round((fecha.getTime() - hoyInicio.getTime()) / MS_POR_DIA)
  return { fecha, diasHasta }
}

export type EstadoProximidad = 'vencido' | 'proximo' | 'mas_adelante'

export function calcularEstadoProximidad(diasHasta: number): EstadoProximidad {
  if (diasHasta < 0) return 'vencido'
  if (diasHasta <= 7) return 'proximo'
  return 'mas_adelante'
}

const FORMATO_CORTO = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })

/** "Hoy" / "Mañana" / "Ayer" / "en N días" / "hace N días" / "vie 3 oct." */
export function formatearFechaRecordatorio(fecha: Date, diasHasta: number): string {
  if (diasHasta === 0) return 'Hoy'
  if (diasHasta === 1) return 'Mañana'
  if (diasHasta === -1) return 'Ayer'
  if (diasHasta > 1 && diasHasta <= 7) return `en ${diasHasta} días`
  if (diasHasta < -1 && diasHasta >= -7) return `hace ${Math.abs(diasHasta)} días`
  // Intl agrega una coma entre el día de semana y el resto ("vie, 3 oct."); se quita para un texto más corto.
  return FORMATO_CORTO.format(fecha).replace(',', '')
}
