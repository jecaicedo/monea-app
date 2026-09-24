/**
 * Formateo de valores para el contexto colombiano.
 */

const FORMATO_COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  // En Colombia los pesos no se muestran con centavos.
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const FORMATO_NUMERO = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** 3403520 -> "$ 3.403.520" */
export function formatearCOP(valor: number): string {
  return FORMATO_COP.format(valor)
}

/** 3403520 -> "3.403.520" (sin símbolo, para cuando ya hay un rótulo) */
export function formatearNumero(valor: number): string {
  return FORMATO_NUMERO.format(valor)
}

/** 0.3 -> "30 %" */
export function formatearPorcentaje(fraccion: number, decimales = 0): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'percent',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(fraccion)
}

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })

/** "2026-03-05T10:00:00Z" -> "5 de marzo de 2026" */
export function formatearFecha(iso: string): string {
  return FORMATO_FECHA.format(new Date(iso))
}

/** Hoy en 'YYYY-MM-DD', en hora LOCAL (no UTC, para no correrse un día según el huso). */
export function fechaISOHoy(): string {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${hoy.getFullYear()}-${mes}-${dia}`
}
