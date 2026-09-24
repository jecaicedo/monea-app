import { IconoBasura } from '@/components/ui/iconos'
import { CampoMoneda } from '@/components/ui/CampoMoneda'
import { Selector } from '@/components/ui/Selector'
import { OPCIONES_FRECUENCIA } from '@/lib/finanzas'
import { usePresupuesto } from '@/stores/presupuesto'
import type { Concepto } from '@/types/basedatos'

/**
 * Fila de un concepto dentro de un bolsillo: nombre, monto, frecuencia y
 * eliminar. El indicador de "guardando" vive a nivel del bolsillo completo
 * (ver TarjetaBolsillo), no aquí — con varios conceptos por bolsillo, un
 * badge por fila sería ruido visual.
 */
interface Props {
  concepto: Concepto
}

// Mismos valores que OPCIONES_FRECUENCIA, pero con la etiqueta abreviada
// ("/mes" en vez de "Mes") para que quepa junto al monto en una fila
// compacta. Es solo una etiqueta de presentación local a esta fila; no
// afecta el selector de frecuencia de Ingresos, que sigue con la palabra
// completa.
const OPCIONES_FRECUENCIA_COMPACTAS = OPCIONES_FRECUENCIA.map((opcion) => ({
  valor: opcion.valor,
  etiqueta: `/${opcion.etiqueta.toLowerCase()}`,
}))

export function ConceptoFila({ concepto }: Props) {
  const actualizarConcepto = usePresupuesto((estado) => estado.actualizarConcepto)
  const eliminarConcepto = usePresupuesto((estado) => estado.eliminarConcepto)

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={`concepto-nombre-${concepto.id}`} className="sr-only">
          Nombre del concepto
        </label>
        <input
          id={`concepto-nombre-${concepto.id}`}
          value={concepto.nombre}
          onChange={(e) => actualizarConcepto(concepto.id, { nombre: e.target.value })}
          placeholder="Nombre del concepto"
          className="h-11 w-full rounded-card border border-border bg-surface-2 px-3.5 text-sm text-text outline-none transition-colors focus:border-accent"
        />
      </div>

      <div className="flex items-end gap-2">
        <div className="w-32 shrink-0 sm:w-36">
          <CampoMoneda
            etiqueta={`Monto de ${concepto.nombre || 'este concepto'}`}
            ocultarEtiqueta
            valor={concepto.monto}
            onCambio={(valor) => actualizarConcepto(concepto.id, { monto: valor })}
          />
        </div>

        <div className="w-28 shrink-0 sm:w-32">
          <Selector
            etiqueta={`Frecuencia de ${concepto.nombre || 'este concepto'}`}
            ocultarEtiqueta
            opciones={OPCIONES_FRECUENCIA_COMPACTAS}
            value={concepto.frecuencia}
            onChange={(e) => actualizarConcepto(concepto.id, { frecuencia: e.target.value as Concepto['frecuencia'] })}
          />
        </div>

        <button
          type="button"
          onClick={() => void eliminarConcepto(concepto.id)}
          aria-label={`Eliminar el concepto ${concepto.nombre || 'sin nombre'}`}
          className="grid size-11 shrink-0 place-items-center rounded-card text-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <IconoBasura className="size-4" />
        </button>
      </div>
    </div>
  )
}
