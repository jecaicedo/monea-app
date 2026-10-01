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
 */

/* global self, clients */

const URL_RECORDATORIOS = '/otros/recordatorios'

self.addEventListener('push', (evento) => {
  // Si el payload no es JSON válido (o no viene), igual se muestra algo: una
  // notificación vacía o un error aquí haría que el navegador muestre su
  // propio aviso genérico de "actualización en segundo plano".
  let datos = {}
  try {
    datos = evento.data ? evento.data.json() : {}
  } catch {
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

  evento.waitUntil(self.registration.showNotification(titulo, opciones))
})

self.addEventListener('notificationclick', (evento) => {
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
