import { useState } from 'react'

import { EditorHorarios } from '@/components/recordatorios/EditorHorarios'
import { obtenerConfigTipo } from '@/components/recordatorios/tiposRecordatorio'
import { Acordeon } from '@/components/ui/Acordeon'
import { Boton } from '@/components/ui/Boton'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { IconoBasura, IconoCheck, IconoFlechaAbajo, IconoLapiz } from '@/components/ui/iconos'
import { IndicadorGuardado } from '@/components/ui/IndicadorGuardado'
import { Interruptor } from '@/components/ui/Interruptor'
import { Selector } from '@/components/ui/Selector'
import { formatearHora, horaParaInput } from '@/lib/formato'
import { calcularEstadoProximidad, calcularProximaOcurrencia, formatearFechaRecordatorio } from '@/lib/recordatorios'
import { useRecordatorios } from '@/stores/recordatorios'
import type { EstadoProximidad } from '@/lib/recordatorios'
import type { Recordatorio, Recurrencia } from '@/types/basedatos'

const OPCIONES_RECURRENCIA = [
  { valor: '', etiqueta: 'Una vez' },
  { valor: 'mensual', etiqueta: 'Mensual' },
  { valor: 'anual', etiqueta: 'Anual' },
]

const ESTILOS_ESTADO: Record<EstadoProximidad, string> = {
  vencido: 'border-danger/40 bg-danger-soft',
  proximo: 'border-accent/40 bg-accent-soft',
  mas_adelante: 'border-border bg-surface',
}

const TEXTO_ESTADO: Record<EstadoProximidad, string> = {
  vencido: 'text-danger',
  proximo: 'text-accent',
  mas_adelante: 'text-muted',
}

const ETIQUETA_ESTADO: Record<EstadoProximidad, string> = {
  vencido: 'Vencido',
  proximo: 'Próximo',
  mas_adelante: '',
}

/**
 * Una tarjeta de recordatorio: todos los campos son editables inline con
 * autosave (mismo patrón que TarjetaBolsilloSobre/TarjetaMetaPropia, sin un
 * modo edición aparte). El color se lo da el ESTADO de proximidad, no el
 * tipo — ver `components/recordatorios/tiposRecordatorio.tsx`.
 *
 * Contraída muestra lo que se consulta de un vistazo (título, tipo, cuándo y a
 * qué horas) y esconde los campos de edición, que son la mayor parte del alto.
 * El título se puede editar sin desplegar: por eso quien alterna es un chevron
 * aparte y no el encabezado entero, que además no podría serlo sin anidar un
 * input dentro de un botón.
 */
interface Props {
  recordatorio: Recordatorio
  abierta: boolean
  onAlternar: () => void
}

export function TarjetaRecordatorio({ recordatorio, abierta, onAlternar }: Props) {
  // El título se edita solo al pedirlo con el lápiz. El resto del tiempo es
  // texto, para que tocarlo expanda la tarjeta y no compita con esa acción.
  const [editando, setEditando] = useState(false)

  const actualizar = useRecordatorios((estado) => estado.actualizar)
  const eliminar = useRecordatorios((estado) => estado.eliminar)
  const guardando = useRecordatorios((estado) => estado.guardando.has(recordatorio.id))

  const horarios = useRecordatorios((estado) => estado.horariosPorRecordatorio[recordatorio.id])
  const agregarHorario = useRecordatorios((estado) => estado.agregarHorario)
  const actualizarHorario = useRecordatorios((estado) => estado.actualizarHorario)
  const eliminarHorario = useRecordatorios((estado) => estado.eliminarHorario)

  // El selector devuelve undefined mientras no haya horarios cargados para
  // este recordatorio; se normaliza una vez aquí en vez de en cada uso.
  const listaHorarios = horarios ?? []

  const config = obtenerConfigTipo(recordatorio.tipo)
  const { fecha, diasHasta } = calcularProximaOcurrencia(recordatorio.fecha, recordatorio.recurrencia)
  const estado = calcularEstadoProximidad(diasHasta)
  const etiquetaEstado = ETIQUETA_ESTADO[estado]

  return (
    <div className={`rounded-panel border p-4 sm:p-5 ${ESTILOS_ESTADO[estado]}`}>
      <Acordeon
        abierta={abierta}
        claseCuerpo="mt-4 flex flex-col gap-3 border-t border-border pt-4"
        encabezado={
          // Todo el encabezado alterna el acordeón, no solo el chevron: es un
          // blanco mucho más cómodo con el dedo. El chevron sigue existiendo
          // porque es el control accesible de verdad (lleva aria-expanded y se
          // alcanza con el teclado); este div es una comodidad para el puntero.
          // Los elementos que tienen su propia acción detienen la propagación.
          <div className="flex cursor-pointer flex-col gap-1.5" onClick={onAlternar}>
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-card bg-surface-2 text-muted"
              >
                <config.Icono className="size-4.5" />
              </span>

              {editando ? (
                <>
                  <label htmlFor={`recordatorio-titulo-${recordatorio.id}`} className="sr-only">
                    Título del recordatorio
                  </label>
                  <input
                    id={`recordatorio-titulo-${recordatorio.id}`}
                    autoFocus
                    value={recordatorio.titulo}
                    onChange={(e) => actualizar(recordatorio.id, { titulo: e.target.value })}
                    // Sin esto, poner el cursor en el título plegaría la tarjeta.
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => setEditando(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') setEditando(false)
                    }}
                    placeholder="Título del recordatorio"
                    className="min-w-0 flex-1 truncate rounded-card bg-surface-2 px-2 py-0.5 font-display text-base font-semibold text-text outline-none"
                  />
                </>
              ) : (
                // Texto plano, no un input: así tocar el título expande la
                // tarjeta como el resto del encabezado, en vez de quedarse
                // quieto y hacer dudar de si la tarjeta se puede abrir.
                <p className="min-w-0 flex-1 truncate font-display text-base font-semibold text-text">
                  {recordatorio.titulo || <span className="text-muted">Sin título</span>}
                </p>
              )}

              <button
                type="button"
                // preventDefault evita que el input pierda el foco al pulsar:
                // si no, el onBlur cerraría la edición y este clic la volvería
                // a abrir.
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation()
                  setEditando((actual) => !actual)
                }}
                aria-label={editando ? 'Terminar de editar el título' : 'Editar el título'}
                className="grid size-8 shrink-0 place-items-center rounded-card text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                {editando ? <IconoCheck className="size-4" /> : <IconoLapiz className="size-4" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  // El contenedor ya alterna; sin frenar aquí se alternaría
                  // dos veces y la tarjeta no se movería.
                  e.stopPropagation()
                  onAlternar()
                }}
                aria-expanded={abierta}
                aria-label={`${abierta ? 'Contraer' : 'Expandir'} ${recordatorio.titulo || 'el recordatorio'}`}
                className="grid size-8 shrink-0 place-items-center rounded-card text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                <IconoFlechaAbajo className={`size-4 transition-transform ${abierta ? 'rotate-180' : ''}`} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void eliminar(recordatorio.id)
                }}
                aria-label={`Eliminar el recordatorio ${recordatorio.titulo || 'sin título'}`}
                className="grid size-8 shrink-0 place-items-center rounded-card text-muted transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <IconoBasura className="size-4" />
              </button>
            </div>

            {/* El resumen va aquí y no en la fila de arriba para que en un
                celular angosto no compita por ancho con el título. */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="font-medium text-muted">{config.etiqueta}</span>
              <span className={`font-semibold ${TEXTO_ESTADO[estado]}`}>
                {formatearFechaRecordatorio(fecha, diasHasta)}
                {etiquetaEstado && ` · ${etiquetaEstado}`}
              </span>
              {/* Las horas solo se muestran si el aviso está activo: apagarlo no
                  las borra, pero mientras tanto no significan nada. */}
              {recordatorio.notificar && listaHorarios.length > 0 && (
                <span className="text-muted">· {listaHorarios.map((h) => formatearHora(h.hora)).join(', ')}</span>
              )}
              <IndicadorGuardado guardando={guardando} />
            </div>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoTexto
            etiqueta="Fecha"
            type="date"
            value={recordatorio.fecha}
            onChange={(e) => actualizar(recordatorio.id, { fecha: e.target.value })}
          />
          <Selector
            etiqueta="Se repite"
            opciones={OPCIONES_RECURRENCIA}
            value={recordatorio.recurrencia ?? ''}
            onChange={(e) =>
              actualizar(recordatorio.id, { recurrencia: (e.target.value || null) as Recurrencia | null })
            }
          />
        </div>

        <Interruptor
          etiqueta="Avisarme"
          activo={recordatorio.notificar}
          onCambio={(valor) => actualizar(recordatorio.id, { notificar: valor })}
        />

        {recordatorio.notificar && (
          <EditorHorarios
            horarios={listaHorarios.map((h) => ({ id: h.id, hora: horaParaInput(h.hora) }))}
            onAgregar={() => void agregarHorario(recordatorio.id)}
            onCambiar={(id, hora) => actualizarHorario(recordatorio.id, id, hora)}
            onEliminar={(id) => void eliminarHorario(recordatorio.id, id)}
          />
        )}
      </Acordeon>
    </div>
  )
}

/** Estado vacío: invita a registrar el primer recordatorio. */
export function TarjetaRecordatorioVacia({ onCrear }: { onCrear: () => void }) {
  return (
    <div className="rounded-panel border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
      <p className="text-sm font-medium text-text">Todavía no tienes recordatorios</p>
      <p className="mx-auto mt-2 max-w-xs text-xs text-muted">
        Registra tu primera fecha de pago, tarjeta, cumpleaños o pico y placa.
      </p>
      <Boton className="mt-5" onClick={onCrear}>
        Añadir mi primer recordatorio
      </Boton>
    </div>
  )
}
