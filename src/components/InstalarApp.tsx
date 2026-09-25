import { useEffect, useState } from 'react'

import { ModalInstalarIOS } from '@/components/ModalInstalarIOS'
import { IconoInstalar } from '@/components/ui/iconos'
import { esIOS, esStandalone } from '@/lib/pwa'

/**
 * Botón "Instalar app", con dos caminos según la plataforma:
 *
 *  - iOS/Safari: nunca dispara `beforeinstallprompt` (Apple no lo soporta),
 *    así que el botón abre un modal con las instrucciones manuales
 *    (Compartir → Agregar a inicio).
 *  - Android/Chromium y escritorio: el navegador sí avisa con
 *    `beforeinstallprompt`; ahí guardamos el evento y el botón dispara el
 *    instalador nativo con `prompt()`.
 *
 * En ambos casos el botón desaparece apenas la app corre instalada (modo
 * standalone) — se revisa al montar y también al recibir `appinstalled`.
 */

/** Evento no estándar de Chromium; TypeScript no lo trae en sus tipos. */
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstalarApp() {
  // Inicializador perezoso: se lee una sola vez al montar, sin pasar por un
  // efecto (evita un renderizado extra innecesario).
  const [standalone, setStandalone] = useState(esStandalone)
  const [evento, setEvento] = useState<EventoInstalacion | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  useEffect(() => {
    function alPoderInstalar(e: Event) {
      // Evita el mini-infobar del navegador: mostramos nuestro propio botón.
      e.preventDefault()
      setEvento(e as EventoInstalacion)
    }

    function alInstalar() {
      setEvento(null)
      setStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', alPoderInstalar)
    window.addEventListener('appinstalled', alInstalar)

    return () => {
      window.removeEventListener('beforeinstallprompt', alPoderInstalar)
      window.removeEventListener('appinstalled', alInstalar)
    }
  }, [])

  async function instalarNativo() {
    if (!evento) return
    await evento.prompt()
    await evento.userChoice
    // El evento solo se puede usar una vez.
    setEvento(null)
  }

  const enIOS = esIOS()
  const mostrarBoton = !standalone && (enIOS || Boolean(evento))

  if (!mostrarBoton) return null

  return (
    <>
      <button
        type="button"
        onClick={() => (enIOS ? setModalAbierto(true) : void instalarNativo())}
        title="Instalar Monea en este dispositivo"
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-pill bg-accent-soft px-3.5 text-sm font-semibold text-accent transition-opacity hover:opacity-85"
      >
        <IconoInstalar className="size-4" />
        Instalar app
      </button>

      <ModalInstalarIOS abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} />
    </>
  )
}
