/**
 * Utilidades de color para datos que traen su propio color (las categorías
 * del presupuesto tienen un hex fijo en la base de datos, pensado para
 * distinguirlas visualmente sin importar el tema claro/oscuro).
 */

/**
 * true si el color hexadecimal es "claro" (conviene texto oscuro encima).
 * Fórmula de luminancia percibida (W3C, forma simplificada).
 */
export function esColorClaro(hex: string): boolean {
  const limpio = hex.replace('#', '')
  const r = parseInt(limpio.slice(0, 2), 16)
  const g = parseInt(limpio.slice(2, 4), 16)
  const b = parseInt(limpio.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}
