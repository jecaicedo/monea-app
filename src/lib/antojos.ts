/**
 * "En cuánto tiempo te alcanza" — el cálculo detrás de Antojos.
 *
 * Es informativo, en vivo: se deriva del excedente mensual actual del
 * presupuesto (el mismo "Te sobra" que ya calculan Metas y el diagnóstico —
 * no se redefine aquí). No es un plan de ahorro comprometido: si el usuario
 * mejora su presupuesto, el antojo "se acerca" solo.
 */

const SEMANAS_POR_MES = 4.3
const DIAS_POR_MES = 30.44

export type ResultadoTiempoAntojo =
  | { tipo: 'sin_excedente' }
  | { tipo: 'este_mes'; semanas: number }
  | { tipo: 'meses'; meses: number; fechaEstimada: Date }

/**
 * Sin excedente positivo no se puede dividir: ese caso se marca aparte en vez
 * de devolver Infinity o NaN a la UI.
 */
export function calcularTiempoParaAntojo(precio: number, excedenteMensual: number): ResultadoTiempoAntojo {
  if (excedenteMensual <= 0) return { tipo: 'sin_excedente' }

  const meses = precio / excedenteMensual
  if (meses < 1) return { tipo: 'este_mes', semanas: meses * SEMANAS_POR_MES }

  const fechaEstimada = new Date()
  fechaEstimada.setDate(fechaEstimada.getDate() + Math.round(meses * DIAS_POR_MES))
  return { tipo: 'meses', meses, fechaEstimada }
}

const FORMATO_MES_ANIO = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' })

/** Texto humano y corto del resultado, listo para destacar en la tarjeta. */
export function formatearTiempoAntojo(resultado: ResultadoTiempoAntojo): string {
  if (resultado.tipo === 'sin_excedente') return 'No te alcanza con tu excedente actual'

  if (resultado.tipo === 'este_mes') {
    const semanas = Math.round(resultado.semanas)
    return semanas <= 1 ? 'Te alcanza esta semana' : `Te alcanza este mes (~${semanas} semanas)`
  }

  const { meses } = resultado
  if (meses <= 12) {
    const redondeado = Math.round(meses * 10) / 10
    return `≈ ${redondeado.toLocaleString('es-CO')} ${redondeado === 1 ? 'mes' : 'meses'}`
  }

  const anios = Math.floor(meses / 12)
  const mesesRestantes = Math.round(meses % 12)
  const parteAnios = `${anios} ${anios === 1 ? 'año' : 'años'}`
  if (mesesRestantes === 0) return `≈ ${parteAnios}`
  return `≈ ${parteAnios} y ${mesesRestantes} ${mesesRestantes === 1 ? 'mes' : 'meses'}`
}

/** "hacia noviembre 2027", solo para el caso con fecha estimada. */
export function formatearFechaEstimada(fecha: Date): string {
  return `hacia ${FORMATO_MES_ANIO.format(fecha)}`
}
