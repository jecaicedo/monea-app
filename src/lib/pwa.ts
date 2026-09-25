/**
 * Detección de plataforma/estado para la instalación de la PWA.
 * Funciones puras, sin React, para poder probarlas o reutilizarlas donde haga
 * falta (el botón de instalar y, a futuro, cualquier otro aviso de PWA).
 */

/**
 * true en iPhone/iPad/iPod. Incluye el caso de iPadOS 13+, que por defecto se
 * reporta como "Macintosh" en el user agent (Safari de escritorio) pero sí
 * tiene pantalla táctil — a diferencia de un Mac de verdad.
 */
export function esIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const esIphoneClasico = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const esIpadOS13Mas = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return esIphoneClasico || esIpadOS13Mas
}

/** true si la app ya corre instalada (modo standalone), en cualquier plataforma. */
export function esStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // En iOS no existe `display-mode: standalone` como media query fiable en
  // todas las versiones; Safari expone en su lugar `navigator.standalone`.
  const standaloneIOS = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return window.matchMedia('(display-mode: standalone)').matches || standaloneIOS
}
