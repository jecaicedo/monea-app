// =============================================================================
// enviar-notificaciones-recordatorios
//
// Edge Function (Deno) que el cron dispara cada 10 minutos. En cada corrida:
//   1. Calcula la hora actual en America/Bogota.
//   2. Pide los horarios que caen en la ventana y cuyo recordatorio ocurre hoy.
//   3. Por cada uno, marca el envio ANTES de mandarlo (idempotencia) y avisa a
//      todas las suscripciones push de su dueno.
//   4. Borra las suscripciones que el navegador ya revoco.
//
// Corre con service_role, asi que hace bypass de RLS: el filtrado por usuario
// es explicito en cada consulta.
//
// Despliegue:
//   npx supabase functions deploy enviar-notificaciones-recordatorios
// =============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

/** Cada cuantos minutos corre el cron. Define el ancho de la ventana. */
const VENTANA_MINUTOS = 10

/** Cuanto se conserva el historial de envios antes de limpiarlo. */
const DIAS_RETENCION_ENVIOS = 30

const ETIQUETA_TIPO: Record<string, string> = {
  pago: 'Pago',
  tarjeta: 'Tarjeta',
  cumpleanos: 'Cumpleaños',
  pico_y_placa: 'Pico y placa',
  otro: 'Recordatorio',
}

interface FilaPendiente {
  horario_id: string
  user_id: string
  hora: string
  titulo: string
  tipo: string
}

interface Suscripcion {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Fecha y hora de Bogota como strings.
 *
 * Se usa `en-CA` porque formatea la fecha como 'YYYY-MM-DD', que es justo lo
 * que espera una columna `date` de Postgres. La alternativa (restar 5 horas a
 * mano) funcionaria hoy, pero deja de ser cierta si Colombia alguna vez adopta
 * horario de verano; delegarlo en Intl es correcto por construccion.
 */
function ahoraEnBogota(): { fecha: string; minutos: number } {
  const ahora = new Date()
  const zona = 'America/Bogota'

  const fecha = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora)

  const [hora, minuto] = new Intl.DateTimeFormat('en-GB', {
    timeZone: zona,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(ahora)
    .split(':')
    .map(Number)

  return { fecha, minutos: hora * 60 + minuto }
}

/** Minutos desde medianoche -> 'HH:MM:SS', para comparar contra una columna `time`. */
function aHoraSql(minutosDesdeMedianoche: number): string {
  const hora = String(Math.floor(minutosDesdeMedianoche / 60)).padStart(2, '0')
  const minuto = String(minutosDesdeMedianoche % 60).padStart(2, '0')
  return `${hora}:${minuto}:00`
}

/** 'YYYY-MM-DD' del día anterior, sin tocar zonas horarias (ya viene resuelto). */
function diaAnterior(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.split('-').map(Number)
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  fecha.setUTCDate(fecha.getUTCDate() - 1)
  return fecha.toISOString().slice(0, 10)
}

interface Tramo {
  fecha: string
  desde: string
  hasta: string
}

/**
 * La ventana de esta corrida, como uno o dos tramos.
 *
 * Mira HACIA ATRAS: a las 10:00 cubre [09:50, 10:00). Asi un aviso llega hasta
 * 10 minutos TARDE y nunca antes de tiempo, que es lo que promete la interfaz
 * ("entre 5 y 15 minutos despues de la hora").
 *
 * Entre las 00:00 y las 00:09 la ventana cruza la medianoche y se parte en
 * dos: el final de ayer y el principio de hoy. Sin esto, recortar en 00:00
 * dejaria sin cubrir los ultimos minutos del dia — un horario a las 23:55 no
 * se avisaria nunca.
 */
function ventanaActual(fecha: string, minutos: number): Tramo[] {
  const inicio = minutos - VENTANA_MINUTOS

  if (inicio >= 0) {
    return [{ fecha, desde: aHoraSql(inicio), hasta: aHoraSql(minutos) }]
  }

  return [
    // Postgres acepta '24:00:00' como `time`, asi que el tramo de ayer llega
    // hasta el final del dia sin dejar un hueco en 23:59.
    { fecha: diaAnterior(fecha), desde: aHoraSql(24 * 60 + inicio), hasta: '24:00:00' },
    { fecha, desde: '00:00:00', hasta: aHoraSql(minutos) },
  ]
}

Deno.serve(async () => {
  const llavePublica = Deno.env.get('VAPID_PUBLIC_KEY')
  const llavePrivada = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT')

  if (!llavePublica || !llavePrivada || !subject) {
    return Response.json(
      { error: 'Faltan VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY o VAPID_SUBJECT en los secretos.' },
      { status: 500 },
    )
  }

  webpush.setVapidDetails(subject, llavePublica, llavePrivada)

  // SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase solo.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { fecha, minutos } = ahoraEnBogota()
  const tramos = ventanaActual(fecha, minutos)

  // El join y el filtro de recurrencia los resuelve Postgres con
  // ocurre_en_fecha() (ver migracion 0012). Aqui no hay aritmetica de
  // calendario a proposito: esta funcion corre en UTC y cerca de medianoche
  // calcularia mal el "hoy" de Bogota.
  const pendientes: (FilaPendiente & { fecha: string })[] = []

  for (const tramo of tramos) {
    const { data, error } = await supabase
      .rpc('horarios_pendientes', { p_fecha: tramo.fecha, p_desde: tramo.desde, p_hasta: tramo.hasta })
      .returns<FilaPendiente[]>()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    for (const fila of data ?? []) pendientes.push({ ...fila, fecha: tramo.fecha })
  }

  let enviadas = 0
  let omitidas = 0
  let suscripcionesBorradas = 0

  for (const pendiente of pendientes) {
    // IDEMPOTENCIA: se marca el envio ANTES de mandarlo. Si otra corrida ya lo
    // tomo, el unique (horario_id, fecha) hace fallar este insert y se omite.
    // Comprobar primero y escribir despues dejaria pasar dos corridas
    // simultaneas; asi la exclusion la da el indice.
    // Se marca con la fecha del TRAMO, no con la de hoy: un aviso de las 23:55
    // que sale a las 00:02 pertenece al día de ayer.
    const { error: errorMarca } = await supabase
      .from('envios_notificacion')
      .insert({ horario_id: pendiente.horario_id, fecha: pendiente.fecha })

    if (errorMarca) {
      omitidas++
      continue
    }

    const { data: suscripciones } = await supabase
      .from('push_subscripciones')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', pendiente.user_id)
      .returns<Suscripcion[]>()

    const carga = JSON.stringify({
      titulo: pendiente.titulo || 'Recordatorio',
      cuerpo: `Recordatorio de Monea · ${ETIQUETA_TIPO[pendiente.tipo] ?? 'Recordatorio'}`,
      url: '/otros/recordatorios',
      tag: `recordatorio-${pendiente.horario_id}`,
    })

    for (const suscripcion of suscripciones ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: suscripcion.endpoint,
            keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth },
          },
          carga,
        )
        enviadas++
      } catch (e) {
        // 404 y 410 significan que el navegador revoco la suscripcion: no se
        // va a recuperar nunca, asi que se borra en vez de reintentar cada 10
        // minutos para siempre. Cualquier otro error (red, 5xx del servicio
        // push) se deja pasar: el proximo dia se vuelve a intentar.
        const codigo = (e as { statusCode?: number }).statusCode
        if (codigo === 404 || codigo === 410) {
          await supabase.from('push_subscripciones').delete().eq('id', suscripcion.id)
          suscripcionesBorradas++
        } else {
          console.error('Fallo el envio push', suscripcion.endpoint, e)
        }
      }
    }
  }

  // Limpieza del historial. Es barata y evita que la tabla crezca sin fin.
  const limite = new Date()
  limite.setDate(limite.getDate() - DIAS_RETENCION_ENVIOS)
  await supabase.from('envios_notificacion').delete().lt('fecha', limite.toISOString().slice(0, 10))

  return Response.json({
    fecha,
    tramos,
    pendientes: pendientes.length,
    enviadas,
    omitidas,
    suscripcionesBorradas,
  })
})
