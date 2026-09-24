import { BarraProgreso } from '@/components/presupuesto/diagnostico/BarraProgreso'
import { CampoMoneda } from '@/components/ui/CampoMoneda'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { IconoBasura, IconoCheck } from '@/components/ui/iconos'
import { IndicadorGuardado } from '@/components/ui/IndicadorGuardado'
import { formatearPorcentaje } from '@/lib/formato'
import { estaMetaLograda } from '@/lib/metas'
import { useMetas } from '@/stores/metas'
import type { Meta } from '@/types/basedatos'

/**
 * Una meta propia del usuario (tipo 'meta'). Mismo patrón que el fondo de
 * emergencia, pero con nombre editable y opción de eliminar. Si la etapa
 * "Metas" está bloqueada, `editable` llega en false: la tarjeta se sigue
 * mostrando tal cual (nada se borra ni se resetea), solo sus campos quedan
 * deshabilitados.
 */
interface Props {
  meta: Meta
  editable: boolean
}

export function TarjetaMetaPropia({ meta, editable }: Props) {
  const actualizarMeta = useMetas((estado) => estado.actualizarMeta)
  const eliminarMeta = useMetas((estado) => estado.eliminarMeta)
  const guardando = useMetas((estado) => estado.guardando.has(meta.id))

  const logrado = estaMetaLograda(meta)
  const fraccion = meta.monto_objetivo > 0 ? meta.monto_actual / meta.monto_objetivo : 0

  return (
    <div
      className={`flex flex-col gap-4 rounded-panel border p-4 sm:p-5 ${
        logrado ? 'border-positive/30 bg-positive-soft' : 'border-border bg-surface'
      }`}
    >
      <div className="flex items-center gap-3">
        {logrado && (
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-positive-fill">
            <IconoCheck className="size-4 text-white" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <label htmlFor={`meta-nombre-${meta.id}`} className="sr-only">
            Nombre de la meta
          </label>
          <input
            id={`meta-nombre-${meta.id}`}
            value={meta.nombre}
            disabled={!editable}
            onChange={(e) => actualizarMeta(meta.id, { nombre: e.target.value })}
            placeholder="Nombre de la meta"
            className="w-full truncate bg-transparent font-display text-base font-semibold text-text outline-none disabled:cursor-not-allowed"
          />
          <p className="text-xs text-muted">{formatearPorcentaje(fraccion)} completado</p>
        </div>

        <IndicadorGuardado guardando={guardando} />

        {editable && (
          <button
            type="button"
            onClick={() => void eliminarMeta(meta.id)}
            aria-label={`Eliminar la meta ${meta.nombre || 'sin nombre'}`}
            className="grid size-9 shrink-0 place-items-center rounded-card text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <IconoBasura className="size-4" />
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CampoMoneda
          etiqueta="Monto objetivo"
          valor={meta.monto_objetivo}
          onCambio={(valor) => actualizarMeta(meta.id, { monto_objetivo: valor })}
          disabled={!editable}
        />
        <CampoMoneda
          etiqueta="Cuánto llevas ahorrado"
          valor={meta.monto_actual}
          onCambio={(valor) => actualizarMeta(meta.id, { monto_actual: valor })}
          disabled={!editable}
        />
      </div>

      <BarraProgreso fraccion={fraccion} color="var(--color-positive-fill)" />

      <CampoTexto
        etiqueta="¿En qué banco? (opcional)"
        placeholder="¿En qué banco? (Nu, Trii, Efectivo...)"
        value={meta.banco ?? ''}
        onChange={(e) => actualizarMeta(meta.id, { banco: e.target.value || null })}
        disabled={!editable}
      />
    </div>
  )
}
