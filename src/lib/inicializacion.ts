import { supabase } from '@/lib/supabase'
import type { ResultadoInicializacion } from '@/types/basedatos'

/**
 * Siembra el presupuesto del usuario la primera vez que entra.
 *
 * Llama a la RPC `inicializar_presupuesto()` del backend, que copia la
 * plantilla global (13 bolsillos y 86 conceptos en monto 0) y crea las dos
 * metas base. La función del backend YA es idempotente: si el usuario tiene
 * bolsillos, no hace nada y responde `ya_inicializado: true`.
 *
 * Aquí guardamos además una marca en localStorage para no gastar una llamada
 * de red en cada inicio de sesión.
 *
 * ---------------------------------------------------------------------------
 * AJUSTES POSIBLES (por si el flujo no te sirve tal cual):
 *
 * 1. Hoy se dispara con el evento SIGNED_IN (ver src/stores/auth.ts). Eso cubre
 *    los dos casos: proyectos con confirmación de correo desactivada (hay
 *    sesión apenas se registra) y con confirmación activada (la sesión llega
 *    después, al abrir el enlace del correo).
 *
 * 2. Si prefieres dispararlo SOLO al registrarse, quita la llamada del
 *    onAuthStateChange y ponla en `registrar()` justo después del signUp
 *    exitoso, comprobando que `data.session` no sea null.
 *
 * 3. Si más adelante quieres que el usuario elija qué plantilla cargar, esta
 *    es la función que hay que cambiar (y la RPC del backend, que hoy no
 *    recibe parámetros).
 * ---------------------------------------------------------------------------
 */

const PREFIJO_MARCA = 'miplata:presupuesto-inicializado:'

function yaMarcado(clave: string): boolean {
  try {
    return window.localStorage.getItem(clave) === '1'
  } catch {
    return false
  }
}

function marcar(clave: string): void {
  try {
    window.localStorage.setItem(clave, '1')
  } catch {
    // Sin localStorage simplemente se reintentará la próxima vez; la RPC es
    // idempotente, así que no pasa nada.
  }
}

export async function asegurarPresupuestoInicializado(
  usuarioId: string,
): Promise<ResultadoInicializacion | null> {
  const clave = PREFIJO_MARCA + usuarioId
  if (yaMarcado(clave)) return null

  const { data, error } = await supabase.rpc('inicializar_presupuesto')

  if (error) {
    // No bloqueamos el ingreso: el usuario entra igual y lo reintentamos en la
    // siguiente sesión. Si esto falla siempre, revisa que la migración 0007
    // esté aplicada y que la función tenga GRANT EXECUTE a `authenticated`.
    console.error('[inicializacion] no se pudo inicializar el presupuesto:', error)
    return null
  }

  const resultado = data as unknown as ResultadoInicializacion
  marcar(clave)

  if (!resultado?.ya_inicializado) {
    console.info(
      `[inicializacion] presupuesto creado: ${resultado?.bolsillos_creados} bolsillos, ` +
        `${resultado?.conceptos_creados} conceptos, ${resultado?.metas_creadas} metas.`,
    )
  }

  return resultado
}
