/**
 * Cálculos financieros del presupuesto.
 *
 * Estas funciones DEBEN coincidir exactamente con sus equivalentes en el
 * backend (supabase/migrations/0002_funciones_comunes.sql y
 * 0007_funciones_negocio.sql). Se recalculan aquí, en el cliente, para que la
 * UI reaccione en vivo mientras el usuario escribe, sin esperar un round-trip
 * a Supabase — pero si el backend cambia de fórmula, hay que actualizar
 * también este archivo.
 */

import type { Frecuencia, FrecuenciaIngreso } from '@/types/basedatos'

/**
 * Redondea un monto en COP al múltiplo de 1.000 más cercano.
 * Refleja public.redondear_mil() del backend: la nómina colombiana liquida
 * las deducciones de salud y pensión redondeadas al mil, no al peso.
 */
export function redondearMil(valor: number): number {
  return Math.round(valor / 1000) * 1000
}

/** Multiplicadores para llevar un monto a su equivalente mensual. */
const MULTIPLICADORES_A_MENSUAL: Record<string, number> = {
  dia: 30,
  dias: 30,
  diario: 30,
  semana: 52 / 12,
  semanas: 52 / 12,
  semanal: 52 / 12,
  quincena: 2,
  quincenal: 2,
  mes: 1,
  mensual: 1,
  bimestre: 1 / 2,
  bimestral: 1 / 2,
  trimestre: 1 / 3,
  trimestral: 1 / 3,
  semestre: 1 / 6,
  semestral: 1 / 6,
  ano: 1 / 12,
  anio: 1 / 12,
  anual: 1 / 12,
}

/**
 * Lleva un monto de cualquier frecuencia a su equivalente mensual.
 * Refleja public.normalizar_a_mensual() del backend.
 */
export function normalizarAMensual(monto: number, frecuencia: Frecuencia | FrecuenciaIngreso | string): number {
  const clave = frecuencia
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes: "año" -> "ano"
  const multiplicador = MULTIPLICADORES_A_MENSUAL[clave] ?? 1
  return monto * multiplicador
}

/** Los campos de un ingreso que hacen falta para calcular su neto. */
export interface DatosNetoIngreso {
  monto_bruto: number
  salud_pct: number
  pension_pct: number
  auxilio_transporte: number
}

/**
 * Neto de UN periodo de un ingreso, en la frecuencia en la que está expresado
 * el bruto (mensual o quincenal — para llevarlo a mensual, envolver el
 * resultado en normalizarAMensual()).
 *
 * Refleja public.neto_ingreso() del backend:
 *   neto = bruto − salud(redondeada al mil) − pensión(redondeada al mil)
 *        + auxilio de transporte − suma de descuentos personalizados
 *
 * Verificado con el caso de referencia: bruto 3.699.520, salud 4% + pensión
 * 4%, auxilio 0, sin descuentos -> neto 3.403.520.
 */
export function netoIngreso(ingreso: DatosNetoIngreso, montosDescuentos: number[] = []): number {
  const salud = redondearMil((ingreso.monto_bruto * ingreso.salud_pct) / 100)
  const pension = redondearMil((ingreso.monto_bruto * ingreso.pension_pct) / 100)
  const totalDescuentos = montosDescuentos.reduce((suma, monto) => suma + monto, 0)
  return ingreso.monto_bruto - salud - pension + ingreso.auxilio_transporte - totalDescuentos
}

/**
 * Las 8 frecuencias válidas de un concepto, con su etiqueta en español, en el
 * orden que se muestran en el selector. 'mes' es el valor por defecto.
 */
export const OPCIONES_FRECUENCIA: { valor: Frecuencia; etiqueta: string }[] = [
  { valor: 'dia', etiqueta: 'Día' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'quincena', etiqueta: 'Quincena' },
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'bimestre', etiqueta: 'Bimestre' },
  { valor: 'trimestre', etiqueta: 'Trimestre' },
  { valor: 'semestre', etiqueta: 'Semestre' },
  { valor: 'anio', etiqueta: 'Año' },
]
