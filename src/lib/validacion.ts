/** Validaciones de formularios, compartidas entre pantallas. */

/** Longitud minima de contrasena que exige la app. */
export const LARGO_MINIMO_CONTRASENA = 8

/**
 * Validacion de correo deliberadamente permisiva: solo descarta lo que
 * claramente no es un correo. La verificacion real la hace Supabase.
 */
export function esCorreoValido(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim())
}
