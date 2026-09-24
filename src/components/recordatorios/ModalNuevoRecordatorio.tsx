import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { TIPOS_RECORDATORIO } from '@/components/recordatorios/tiposRecordatorio'
import { Boton } from '@/components/ui/Boton'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { Interruptor } from '@/components/ui/Interruptor'
import { Modal } from '@/components/ui/Modal'
import { Selector } from '@/components/ui/Selector'
import { fechaISOHoy } from '@/lib/formato'
import { useRecordatorios } from '@/stores/recordatorios'
import type { Recurrencia, TipoRecordatorio } from '@/types/basedatos'

/** '' -> una vez (recurrencia null). Las demás opciones del CHECK del backend no se exponen aquí. */
const OPCIONES_RECURRENCIA = [
  { valor: '', etiqueta: 'Una vez' },
  { valor: 'mensual', etiqueta: 'Mensual' },
  { valor: 'anual', etiqueta: 'Anual' },
]

/**
 * Modal "Nuevo recordatorio": tipo (cuadrícula de íconos), título, fecha,
 * recurrencia y el interruptor "Avisarme" (por ahora solo se guarda, ver
 * `stores/recordatorios.ts`).
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
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    if (abierto) {
      setTipo('pago')
      setTitulo('')
      setFecha(fechaISOHoy())
      setRecurrencia('')
      setNotificar(true)
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

    setCreando(true)
    await crear({
      tipo,
      titulo: tituloLimpio,
      fecha,
      recurrencia: (recurrencia || null) as Recurrencia | null,
      notificar,
    })
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
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
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
