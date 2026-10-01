import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { EditorHorarios } from '@/components/recordatorios/EditorHorarios'
import { TIPOS_RECORDATORIO } from '@/components/recordatorios/tiposRecordatorio'
import { Boton } from '@/components/ui/Boton'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { Interruptor } from '@/components/ui/Interruptor'
import { Modal } from '@/components/ui/Modal'
import { Selector } from '@/components/ui/Selector'
import { fechaISOHoy } from '@/lib/formato'
import { horaSugerida, MAX_HORARIOS, useRecordatorios } from '@/stores/recordatorios'
import type { Recurrencia, TipoRecordatorio } from '@/types/basedatos'

/** '' -> una vez (recurrencia null). Las demás opciones del CHECK del backend no se exponen aquí. */
const OPCIONES_RECURRENCIA = [
  { valor: '', etiqueta: 'Una vez' },
  { valor: 'mensual', etiqueta: 'Mensual' },
  { valor: 'anual', etiqueta: 'Anual' },
]

/**
 * Modal "Nuevo recordatorio": tipo (cuadrícula de íconos), título, fecha,
 * recurrencia, el interruptor "Avisarme" y sus horas de aviso (por ahora solo
 * se guardan, ver `stores/recordatorios.ts`).
 *
 * Las horas viven en estado local hasta que se envía el formulario: el
 * recordatorio todavía no existe y la FK compuesta necesita su id, así que el
 * store las inserta después de crearlo.
 */
interface Props {
  abierto: boolean
  onCerrar: () => void
}

export function ModalNuevoRecordatorio({ abierto, onCerrar }: Props) {
  const crear = useRecordatorios((estado) => estado.crear)

  const [tipo, setTipo] = useState<TipoRecordatorio>('pago')
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState(fechaISOHoy())
  const [recurrencia, setRecurrencia] = useState('')
  const [notificar, setNotificar] = useState(true)
  const [horas, setHoras] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    if (abierto) {
      setTipo('pago')
      setTitulo('')
      setFecha(fechaISOHoy())
      setRecurrencia('')
      setNotificar(true)
      setHoras([])
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  const configTipoActual = TIPOS_RECORDATORIO.find((config) => config.valor === tipo)!

  async function manejarCrear(evento: FormEvent) {
    evento.preventDefault()

    const tituloLimpio = titulo.trim()
    if (!tituloLimpio) {
      setError('Ponle un título al recordatorio.')
      return
    }
    if (!fecha) {
      setError('Elige una fecha.')
      return
    }

    if (notificar && new Set(horas).size !== horas.length) {
      setError('Tienes dos horarios con la misma hora.')
      return
    }

    setCreando(true)
    await crear(
      {
        tipo,
        titulo: tituloLimpio,
        fecha,
        recurrencia: (recurrencia || null) as Recurrencia | null,
        notificar,
      },
      // Con el aviso apagado no se guardan horas; si está encendido y no
      // eligió ninguna, el store pone la de por defecto.
      notificar ? horas : [],
    )
    setCreando(false)
    onCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Nuevo recordatorio"
      descripcion="Tus fechas de pago, tarjetas, cumpleaños y el pico y placa."
    >
      <form onSubmit={manejarCrear} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Tipo</span>
          {/* auto-rows-fr iguala el alto de las dos filas: sin eso, la que
              contiene "Pico y placa" (que parte en dos líneas) queda más alta
              que la de arriba y la cuadrícula se ve desalineada. */}
          <div className="grid auto-rows-fr grid-cols-3 gap-2 sm:grid-cols-5">
            {TIPOS_RECORDATORIO.map((config) => {
              const seleccionado = config.valor === tipo
              return (
                <button
                  key={config.valor}
                  type="button"
                  onClick={() => setTipo(config.valor)}
                  aria-pressed={seleccionado}
                  className={[
                    'flex flex-col items-center gap-1.5 rounded-card border p-2.5 text-center transition-colors',
                    seleccionado
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-border text-muted hover:text-text',
                  ].join(' ')}
                >
                  <config.Icono className="size-5" />
                  <span className="text-[11px] leading-tight font-medium">{config.etiqueta}</span>
                </button>
              )
            })}
          </div>
        </div>

        <CampoTexto
          etiqueta="Título"
          placeholder={configTipoActual.placeholderTitulo}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          autoFocus
        />

        <CampoTexto etiqueta="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />

        <Selector
          etiqueta="Se repite"
          opciones={OPCIONES_RECURRENCIA}
          value={recurrencia}
          onChange={(e) => setRecurrencia(e.target.value)}
        />

        <Interruptor
          etiqueta="Avisarme"
          descripcion="Por ahora solo se guarda tu preferencia."
          activo={notificar}
          onCambio={setNotificar}
        />

        {notificar && (
          <EditorHorarios
            horarios={horas.map((hora, indice) => ({ id: String(indice), hora }))}
            onAgregar={() =>
              setHoras((actuales) =>
                actuales.length >= MAX_HORARIOS ? actuales : [...actuales, horaSugerida(actuales)],
              )
            }
            onCambiar={(id, hora) =>
              setHoras((actuales) => actuales.map((valor, indice) => (String(indice) === id ? hora : valor)))
            }
            onEliminar={(id) => setHoras((actuales) => actuales.filter((_, indice) => String(indice) !== id))}
          />
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Boton type="submit" cargando={creando} anchoCompleto>
          Guardar recordatorio
        </Boton>
      </form>
    </Modal>
  )
}
