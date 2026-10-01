/**
 * Manejo de Web Push dentro del service worker.
 *
 * Este archivo NO es el service worker: lo carga el que genera Workbox, vía
 * `workbox.importScripts` en vite.config.ts. Se hizo así para no cambiar a
 * `injectManifest`, que nos obligaría a reescribir a mano todo el precache, el
 * navigateFallback de la SPA y el skipWaiting que necesita `autoUpdate`.
 *
 * Por eso es JavaScript plano: no pasa por TypeScript ni por el bundler. El
 * navegador compara estos importScripts byte a byte al buscar actualizaciones,
 * así que los cambios llegan igual que los del resto del service worker.
 *
 * OJO si este archivo llegara a dar 404 en producción: `importScripts` lanza y
 * el service worker ENTERO falla al instalarse — no solo el push, también el
 * caché y el modo sin conexión. Por eso lo primero que hace es anunciarse en
 * la consola.
 */

/* global self, clients */

/**
 * Sube este número al cambiar el archivo. Sirve para saber, desde la consola
 * del service worker, si el dispositivo ya está corriendo la versión nueva o
 * se quedó con una vieja en caché — que es el modo de falla más común en una
 * PWA instalada en iOS.
 */
const VERSION_PUSH_SW = 2

const PREFIJO = '[monea-push]'
const URL_RECORDATORIOS = '/otros/recordatorios'

console.log(`${PREFIJO} cargado, versión ${VERSION_PUSH_SW}`)

self.addEventListener('push', (evento) => {
  console.log(`${PREFIJO} evento push recibido`, { tieneDatos: Boolean(evento.data) })

  // Nunca se deja que una excepción salga de aquí: si el listener lanza, el
  // navegador descarta el push en silencio y no se muestra absolutamente nada.
  let datos = {}
  try {
    datos = evento.data ? evento.data.json() : {}
    console.log(`${PREFIJO} payload interpretado`, datos)
  } catch (error) {
    // Se registra el texto crudo: si el payload no era JSON, esto es lo único
    // que permite ver qué llegó de verdad.
    let crudo = '(no se pudo leer)'
    try {
      crudo = evento.data ? evento.data.text() : '(sin datos)'
    } catch {
      /* se queda el valor por defecto */
    }
    console.error(`${PREFIJO} el payload no era JSON válido`, crudo, error)
    datos = {}
  }

  const titulo = datos.titulo || 'Monea'
  const opciones = {
    body: datos.cuerpo || 'Tienes un recordatorio.',
    icon: '/monea-192x192.png',
    badge: '/monea-96x96.png',
    lang: 'es-CO',
    // Agrupa por recordatorio: si llegaran dos avisos del mismo, el segundo
    // reemplaza al primero en vez de apilarse.
    tag: datos.tag || 'monea-recordatorio',
    data: { url: datos.url || URL_RECORDATORIOS },
  }

  console.log(`${PREFIJO} mostrando notificación`, titulo, opciones)

  evento.waitUntil(
    self.registration
      .showNotification(titulo, opciones)
      .then(() => console.log(`${PREFIJO} notificación mostrada`))
      .catch((error) => {
        // Si showNotification falla (permiso revocado, opción inválida), se
        // reintenta con lo mínimo indispensable: más vale un aviso soso que
        // ninguno. En iOS basta que una opción no le guste para no mostrar nada.
        console.error(`${PREFIJO} showNotification falló, reintentando sin opciones`, error)
        return self.registration.showNotification(titulo, { body: opciones.body })
      }),
  )
})

self.addEventListener('notificationclick', (evento) => {
  console.log(`${PREFIJO} notificación pulsada`)
  evento.notification.close()

  const destino = (evento.notification.data && evento.notification.data.url) || URL_RECORDATORIOS

  evento.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      // Si la app ya está abierta se reutiliza esa ventana y se navega dentro,
      // en vez de abrir una pestaña más.
      for (const ventana of ventanas) {
        if ('focus' in ventana) {
          if ('navigate' in ventana) ventana.navigate(destino)
          return ventana.focus()
        }
      }
      return clients.openWindow(destino)
    }),
  )
})
