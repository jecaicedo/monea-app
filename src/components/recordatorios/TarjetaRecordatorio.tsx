import { obtenerConfigTipo } from '@/components/recordatorios/tiposRecordatorio'
import { Boton } from '@/components/ui/Boton'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { IconoBasura } from '@/components/ui/iconos'
import { IndicadorGuardado } from '@/components/ui/IndicadorGuardado'
import { Interruptor } from '@/components/ui/Interruptor'
import { Selector } from '@/components/ui/Selector'
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
 */
interface Props {
  recordatorio: Recordatorio
}

export function TarjetaRecordatorio({ recordatorio }: Props) {
  const actualizar = useRecordatorios((estado) => estado.actualizar)
  const eliminar = useRecordatorios((estado) => estado.eliminar)
  const guardando = useRecordatorios((estado) => estado.guardando.has(recordatorio.id))

  const config = obtenerConfigTipo(recordatorio.tipo)
  const { fecha, diasHasta } = calcularProximaOcurrencia(recordatorio.fecha, recordatorio.recurrencia)
  const estado = calcularEstadoProximidad(diasHasta)
  const etiquetaEstado = ETIQUETA_ESTADO[estado]

  return (
    <div className={`flex flex-col gap-3 rounded-panel border p-4 sm:p-5 ${ESTILOS_ESTADO[estado]}`}>
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-card bg-surface-2 text-muted">
          <config.Icono className="size-4.5" />
        </span>

        <label htmlFor={`recordatorio-titulo-${recordatorio.id}`} className="sr-only">
          Título del recordatorio
        </label>
        <input
          id={`recordatorio-titulo-${recordatorio.id}`}
          value={recordatorio.titulo}
          onChange={(e) => actualizar(recordatorio.id, { titulo: e.target.value })}
          placeholder="Título del recordatorio"
          className="min-w-0 flex-1 truncate bg-transparent font-display text-base font-semibold text-text outline-none"
        />

        <IndicadorGuardado guardando={guardando} />

        <button
          type="button"
          onClick={() => void eliminar(recordatorio.id)}
          aria-label={`Eliminar el recordatorio ${recordatorio.titulo || 'sin título'}`}
          className="grid size-8 shrink-0 place-items-center rounded-card text-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <IconoBasura className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="font-medium text-muted">{config.etiqueta}</span>
        <span className={`font-semibold ${TEXTO_ESTADO[estado]}`}>
          {formatearFechaRecordatorio(fecha, diasHasta)}
          {etiquetaEstado && ` · ${etiquetaEstado}`}
        </span>
      </div>

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
