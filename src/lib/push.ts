import { supabase } from '@/lib/supabase'
import { esIOS, esStandalone } from '@/lib/pwa'

/**
 * Web Push: permiso del navegador, suscripción y persistencia.
 *
 * Funciones sueltas y no un store porque no hay estado compartido entre
 * pantallas: el único componente que las usa lleva su propio estado local.
 *
 * El envío real lo hace la Edge Function `enviar-notificaciones-recordatorios`
 * cada 10 minutos; aquí solo se registra a quién avisarle.
 */

export type EstadoPermiso =
  /** El navegador no soporta push (o no hay service worker). */
  | 'no-soportado'
  /** iOS sin la PWA instalada: Apple no permite push a una web suelta. */
  | 'requiere-instalar'
  | 'sin-pedir'
  | 'concedido'
  | 'denegado'

/**
 * Qué se le puede ofrecer al usuario en este navegador.
 *
 * iOS va primero a propósito: Safari expone `Notification` incluso sin la PWA
 * instalada, pero `pushManager.subscribe()` falla. Preguntarlo antes evita
 * pedir un permiso que no va a servir para nada.
 */
export function estadoPermiso(): EstadoPermiso {
  if (typeof window === 'undefined') return 'no-soportado'
  if (esIOS() && !esStandalone()) return 'requiere-instalar'

  const soportado = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
  if (!soportado) return 'no-soportado'

  if (Notification.permission === 'granted') return 'concedido'
  if (Notification.permission === 'denied') return 'denegado'
  return 'sin-pedir'
}

/**
 * La llave VAPID viaja en base64url y `pushManager.subscribe` la pide como
 * bytes crudos.
 */
function base64UrlABytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const relleno = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const binario = atob(base64)

  // Se construye sobre un ArrayBuffer explícito: `Uint8Array.from` devuelve un
  // Uint8Array<ArrayBufferLike>, que podría ser compartido, y `subscribe` solo
  // acepta un buffer normal.
  const bytes = new Uint8Array(new ArrayBuffer(binario.length))
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}

/** Las llaves de la suscripción llegan como ArrayBuffer y se guardan en base64url. */
function bytesABase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const binario = String.fromCharCode(...new Uint8Array(buffer))
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Pide permiso (si hace falta), suscribe al service worker y guarda la
 * suscripción. Devuelve el estado en el que quedó.
 *
 * Una vez denegado, el navegador NO deja volver a preguntar desde código: hay
 * que reactivarlo a mano desde la configuración del sitio. Por eso el estado
 * 'denegado' es un callejón sin salida que la interfaz explica.
 */
export async function activarNotificaciones(): Promise<EstadoPermiso> {
  const estadoInicial = estadoPermiso()
  if (estadoInicial !== 'sin-pedir' && estadoInicial !== 'concedido') return estadoInicial

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') return permiso === 'denied' ? 'denegado' : 'sin-pedir'

  const llavePublica = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!llavePublica) {
    throw new Error('Falta VITE_VAPID_PUBLIC_KEY: no se puede suscribir a las notificaciones.')
  }

  const registro = await navigator.serviceWorker.ready

  // Si ya había una suscripción se reutiliza: volver a suscribir con la misma
  // llave devuelve la misma, pero pedirla evita un error si cambió la llave.
  const suscripcion =
    (await registro.pushManager.getSubscription()) ??
    (await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlABytes(llavePublica),
    }))

  await guardarSuscripcion(suscripcion)
  return 'concedido'
}

/**
 * Guarda (o reasigna) la suscripción de este navegador.
 *
 * El upsert va por `endpoint`, que es único a secas: si el aparato estaba
 * registrado para otra cuenta, la fila cambia de dueño en vez de duplicarse.
 */
async function guardarSuscripcion(suscripcion: PushSubscription): Promise<void> {
  const { data: sesion } = await supabase.auth.getUser()
  const usuarioId = sesion.user?.id
  if (!usuarioId) return

  const { error } = await supabase.from('push_subscripciones').upsert(
    {
      user_id: usuarioId,
      endpoint: suscripcion.endpoint,
      p256dh: bytesABase64Url(suscripcion.getKey('p256dh')),
      auth: bytesABase64Url(suscripcion.getKey('auth')),
    },
    { onConflict: 'endpoint' },
  )

  if (error) throw new Error(error.message)
}

/**
 * Deja de recibir avisos en ESTE navegador: cancela la suscripción y borra su
 * fila. No toca el permiso, que solo el usuario puede revocar.
 */
export async function desactivarNotificaciones(): Promise<void> {
  const registro = await navigator.serviceWorker.ready
  const suscripcion = await registro.pushManager.getSubscription()
  if (!suscripcion) return

  await supabase.from('push_subscripciones').delete().eq('endpoint', suscripcion.endpoint)
  await suscripcion.unsubscribe()
}

/** true si este navegador ya está suscrito (no solo con el permiso dado). */
export async function estaSuscrito(): Promise<boolean> {
  if (estadoPermiso() !== 'concedido') return false
  const registro = await navigator.serviceWorker.ready
  return (await registro.pushManager.getSubscription()) !== null
}
