import { useEffect, useState } from 'react'

import { IconoInstalar } from '@/components/ui/iconos'

/**
 * Botón "Instalar app".
 *
 * El navegador avisa que la app se puede instalar con el evento
 * `beforeinstallprompt`; ahí guardamos el evento y mostramos el botón. Si el
 * evento nunca llega, el botón NO se muestra, y es lo correcto:
 *
 *  - la app ya está instalada y abierta en modo standalone,
 *  - o el navegador no soporta la instalación (Safari en iOS, por ejemplo,
 *    donde se instala manualmente con "Compartir → Añadir a pantalla de inicio"),
 *  - o todavía no se cumplen los requisitos (service worker + manifest + HTTPS;
 *    en desarrollo localhost cuenta como seguro).
 */

/** Evento no estándar de Chromium; TypeScript no lo trae en sus tipos. */
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function BotonInstalar() {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null)

  useEffect(() => {
    function alPoderInstalar(e: Event) {
      // Evita el mini-infobar del navegador: mostramos nuestro propio botón.
      e.preventDefault()
      setEvento(e as EventoInstalacion)
    }

    function alInstalar() {
      setEvento(null)
    }

    window.addEventListener('beforeinstallprompt', alPoderInstalar)
    window.addEventListener('appinstalled', alInstalar)

    return () => {
      window.removeEventListener('beforeinstallprompt', alPoderInstalar)
      window.removeEventListener('appinstalled', alInstalar)
    }
  }, [])

  if (!evento) return null

  async function instalar() {
    if (!evento) return
    await evento.prompt()
    await evento.userChoice
    // El evento solo se puede usar una vez.
    setEvento(null)
  }

  return (
    <button
      type="button"
      onClick={() => void instalar()}
      title="Instalar Monea en este dispositivo"
      className="flex h-10 items-center gap-1.5 rounded-pill px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
    >
      <IconoInstalar className="size-[18px]" />
      <span className="hidden sm:inline">Instalar</span>
    </button>
  )
}
