import type { Meta } from '@/types/basedatos'

/**
 * Derivación de los tres estados de la pantalla de Metas. Son funciones
 * puras y "en vivo": no leen ni escriben nada — toda la cascada se puede
 * recalcular en cualquier momento a partir del excedente actual y de las
 * filas de `metas`, así que nada queda congelado en un estado viejo.
 *
 * Cascada: "Pasar en positivo" → "Fondo de emergencia" → "Metas". Cada nivel
 * exige que el anterior se siga cumpliendo AHORA MISMO; si deja de cumplirse,
 * ese nivel y los de abajo se bloquean (sin borrar ni resetear datos), y se
 * recuperan solos en cuanto la condición se vuelve a cumplir.
 */

/** "Te sobra" (ingresos − gastos − ahorro) sin números rojos. */
export function calcularEnPositivo(excedente: number): boolean {
  return excedente >= 0
}

/**
 * El fondo de emergencia solo cuenta como logrado si, además de estar
 * completo, el presupuesto sigue en positivo — si se cae en déficit, el
 * fondo se considera "descompletado" aunque el monto ahorrado siga intacto.
 */
export function calcularFondoLogrado(metaFondo: Meta | undefined, enPositivo: boolean): boolean {
  if (!metaFondo || !enPositivo) return false
  return metaFondo.monto_objetivo > 0 && metaFondo.monto_actual >= metaFondo.monto_objetivo
}

/**
 * Una meta propia lograda es simplemente monto_actual >= monto_objetivo: a
 * diferencia del fondo, NO depende de la cascada — si la etapa "Metas" se
 * vuelve a bloquear, una meta ya lograda sigue contando como lograda (el
 * dato se conserva tal cual).
 */
export function estaMetaLograda(meta: Meta): boolean {
  return meta.monto_objetivo > 0 && meta.monto_actual >= meta.monto_objetivo
}
