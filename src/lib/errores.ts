import type { AuthError } from '@supabase/supabase-js'

/**
 * Traduce los errores de Supabase Auth a mensajes en español que le sirvan al
 * usuario. Supabase responde en inglés y con textos técnicos; mostrarlos tal
 * cual es confuso.
 *
 * Primero miramos `code` (estable entre versiones) y solo si no lo reconocemos
 * caemos al texto del mensaje.
 */

const POR_CODIGO: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Todavía no confirmaste tu correo. Revisa tu bandeja de entrada.',
  user_already_exists: 'Ese correo ya está registrado. Inicia sesión.',
  email_exists: 'Ese correo ya está registrado. Inicia sesión.',
  weak_password: 'La contraseña es muy débil. Usa al menos 8 caracteres.',
  over_request_rate_limit: 'Demasiados intentos seguidos. Espera un momento y vuelve a probar.',
  over_email_send_rate_limit: 'Se enviaron demasiados correos. Espera unos minutos.',
  validation_failed: 'Revisa los datos: hay algo mal escrito.',
  signup_disabled: 'El registro está deshabilitado en este proyecto.',
  email_address_invalid: 'Ese correo no parece válido.',
  session_expired: 'Tu sesión expiró. Vuelve a entrar.',
  user_banned: 'Esta cuenta está bloqueada.',
}

const POR_MENSAJE: [RegExp, string][] = [
  [/invalid login credentials/i, 'Correo o contraseña incorrectos.'],
  [/email not confirmed/i, 'Todavía no confirmaste tu correo. Revisa tu bandeja de entrada.'],
  [/user already registered/i, 'Ese correo ya está registrado. Inicia sesión.'],
  [/password should be at least/i, 'La contraseña es muy corta.'],
  [/for security purposes/i, 'Demasiados intentos seguidos. Espera un momento y vuelve a probar.'],
  [/failed to fetch|network|load failed/i, 'No pudimos conectar. Revisa tu conexión a internet.'],
]

export function mensajeDeError(error: unknown): string {
  if (!error) return 'Ocurrió un error inesperado.'

  const err = error as Partial<AuthError> & { code?: string; message?: string }

  if (err.code && POR_CODIGO[err.code]) return POR_CODIGO[err.code]

  if (err.message) {
    for (const [patron, texto] of POR_MENSAJE) {
      if (patron.test(err.message)) return texto
    }
    // Sin traducción conocida: mostramos el original para no ocultar la causa,
    // pero queda registrado en consola para depurar.
    console.error('[auth] error sin traducir:', error)
    return err.message
  }

  console.error('[auth] error desconocido:', error)
  return 'Ocurrió un error inesperado.'
}
