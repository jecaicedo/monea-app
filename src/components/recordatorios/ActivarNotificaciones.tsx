import { useEffect, useState } from 'react'

import { Boton } from '@/components/ui/Boton'
import { IconoCampana, IconoCheck } from '@/components/ui/iconos'
import { activarNotificaciones, desactivarNotificaciones, estadoPermiso, estaSuscrito } from '@/lib/push'
import type { EstadoPermiso } from '@/lib/push'

/**
 * Tarjeta para activar las notificaciones push en ESTE navegador.
 *
 * El permiso es por aparato, no por cuenta: activarlo en el celular no lo
 * activa en el computador, y por eso el texto habla de "este dispositivo".
 *
 * Una vez denegado, ningún navegador deja volver a pedirlo desde código, así
 * que ese estado solo puede explicar cómo reactivarlo a mano.
 */
export function ActivarNotificaciones() {
  // El permiso se lee del navegador en el primer render, no en un efecto: es
  // un valor síncrono y pedirlo en un efecto provocaría un render de más.
  const [estado, setEstado] = useState<EstadoPermiso>(estadoPermiso)
  const [suscrito, setSuscrito] = useState(false)
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Saber si ya hay una suscripción sí es asíncrono (hay que esperar al
  // service worker), así que eso sí va en un efecto.
  useEffect(() => {
    void estaSuscrito().then(setSuscrito)
  }, [])

  async function activar() {
    setTrabajando(true)
    setError(null)
    try {
      const resultado = await activarNotificaciones()
      setEstado(resultado)
      setSuscrito(await estaSuscrito())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron activar las notificaciones.')
    }
    setTrabajando(false)
  }

  async function desactivar() {
    setTrabajando(true)
    setError(null)
    try {
      await desactivarNotificaciones()
      setSuscrito(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron desactivar las notificaciones.')
    }
    setTrabajando(false)
  }

  // En un navegador sin soporte no hay nada que ofrecer ni que explicar.
  if (estado === 'no-soportado') return null

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <div className="flex items-start gap-2.5">
        <IconoCampana className="mt-0.5 size-4 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">Notificaciones en este dispositivo</p>
          <p className="mt-1 text-xs text-muted">{TEXTO_POR_ESTADO[estado]}</p>
        </div>

        {estado === 'concedido' && suscrito && (
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-positive">
            <IconoCheck className="size-3.5" />
            Activas
          </span>
        )}
      </div>

      {estado === 'requiere-instalar' && (
        <p className="text-xs text-muted">
          Toca el botón <span className="font-semibold text-text">Instalar</span> en la parte de arriba de la app
          para agregarla a tu pantalla de inicio, ábrela desde ahí y vuelve a esta pantalla.
        </p>
      )}

      {(estado === 'sin-pedir' || (estado === 'concedido' && !suscrito)) && (
        <Boton tamano="sm" onClick={() => void activar()} cargando={trabajando} className="self-start">
          Activar notificaciones
        </Boton>
      )}

      {estado === 'concedido' && suscrito && (
        <Boton
          variante="texto"
          tamano="sm"
          onClick={() => void desactivar()}
          cargando={trabajando}
          className="self-start"
        >
          Dejar de recibir en este dispositivo
        </Boton>
      )}

      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

const TEXTO_POR_ESTADO: Record<EstadoPermiso, string> = {
  'no-soportado': '',
  'requiere-instalar':
    'En iPhone y iPad las notificaciones solo funcionan con la app instalada en la pantalla de inicio.',
  'sin-pedir':
    'Te avisamos a las horas que configures en cada recordatorio. El aviso puede llegar entre 5 y 15 minutos después.',
  concedido: 'Vas a recibir un aviso a las horas que configures en cada recordatorio.',
  denegado:
    'Bloqueaste las notificaciones para este sitio. Para reactivarlas, ábrelas desde la configuración del navegador (el candado junto a la dirección) y permite las notificaciones.',
}
