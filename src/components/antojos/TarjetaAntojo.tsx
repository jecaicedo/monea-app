import { Link } from 'react-router-dom'

import { Boton } from '@/components/ui/Boton'
import { CampoMoneda } from '@/components/ui/CampoMoneda'
import { IconoBasura, IconoCargando, IconoRegalo } from '@/components/ui/iconos'
import { IndicadorGuardado } from '@/components/ui/IndicadorGuardado'
import { calcularTiempoParaAntojo, formatearFechaEstimada, formatearTiempoAntojo } from '@/lib/antojos'
import { useAntojos } from '@/stores/antojos'
import type { Antojo } from '@/types/basedatos'

/**
 * Una tarjeta de antojo: foto (o un placeholder si no hay), nombre y precio
 * editables (autosave), y el resultado de "en cuánto tiempo te alcanza"
 * destacado — se recalcula en vivo con el excedente actual del presupuesto.
 */
interface Props {
  antojo: Antojo
  urlFoto?: string
  excedenteMensual: number
}

export function TarjetaAntojo({ antojo, urlFoto, excedenteMensual }: Props) {
  const actualizar = useAntojos((estado) => estado.actualizar)
  const eliminar = useAntojos((estado) => estado.eliminar)
  const guardando = useAntojos((estado) => estado.guardando.has(antojo.id))
  const subiendoFoto = useAntojos((estado) => estado.subiendoFoto.has(antojo.id))

  const resultado = calcularTiempoParaAntojo(antojo.precio, excedenteMensual)
  const sinExcedente = resultado.tipo === 'sin_excedente'

  return (
    <div className="flex gap-4 rounded-panel border border-border bg-surface p-4 sm:p-5">
      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-card bg-surface-2 text-muted">
        {subiendoFoto ? (
          <IconoCargando className="size-5 animate-spin" />
        ) : urlFoto ? (
          <img src={urlFoto} alt={antojo.nombre || 'Antojo'} className="size-full object-cover" />
        ) : (
          <IconoRegalo className="size-7" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start gap-2">
          <label htmlFor={`antojo-nombre-${antojo.id}`} className="sr-only">
            Nombre del antojo
          </label>
          <input
            id={`antojo-nombre-${antojo.id}`}
            value={antojo.nombre}
            onChange={(e) => actualizar(antojo.id, { nombre: e.target.value })}
            placeholder="Nombre del antojo"
            className="min-w-0 flex-1 truncate bg-transparent font-display text-base font-semibold text-text outline-none"
          />
          <IndicadorGuardado guardando={guardando} />
          <button
            type="button"
            onClick={() => void eliminar(antojo.id)}
            aria-label={`Eliminar el antojo ${antojo.nombre || 'sin nombre'}`}
            className="grid size-8 shrink-0 place-items-center rounded-card text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <IconoBasura className="size-4" />
          </button>
        </div>

        <CampoMoneda
          etiqueta="Precio"
          ocultarEtiqueta
          valor={antojo.precio}
          onCambio={(valor) => actualizar(antojo.id, { precio: valor })}
        />

        {sinExcedente ? (
          <p className="text-sm text-danger">
            {formatearTiempoAntojo(resultado)}.{' '}
            <Link to="/presupuesto/revisa" className="font-semibold hover:underline">
              Revisa tu presupuesto →
            </Link>
          </p>
        ) : (
          <p className="text-sm font-semibold text-positive">
            {formatearTiempoAntojo(resultado)}
            {resultado.tipo === 'meses' && (
              <span className="ml-1.5 font-normal text-muted">{formatearFechaEstimada(resultado.fechaEstimada)}</span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

/** Estado vacío: invita a registrar el primer antojo. */
export function TarjetaAntojoVacia({ onCrear }: { onCrear: () => void }) {
  return (
    <div className="rounded-panel border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
      <p className="text-sm font-medium text-text">Todavía no tienes antojos guardados</p>
      <p className="mx-auto mt-2 max-w-xs text-xs text-muted">
        Registra lo primero que quieras comprarte y mira en cuánto tiempo te alcanza.
      </p>
      <Boton className="mt-5" onClick={onCrear}>
        Añadir mi primer antojo
      </Boton>
    </div>
  )
}
