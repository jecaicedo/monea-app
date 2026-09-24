import { useState } from 'react'
import type { FormEvent } from 'react'

import { Boton } from '@/components/ui/Boton'
import { CampoMoneda } from '@/components/ui/CampoMoneda'
import { IconoBasura, IconoMas } from '@/components/ui/iconos'
import { formatearCOP } from '@/lib/formato'
import { useIngresos } from '@/stores/ingresos'
import type { DeduccionPersonalizada } from '@/types/basedatos'

/**
 * Descuentos personalizados de un ingreso (libranzas, fondo de empleados,
 * embargos…). A diferencia de salud/pensión, estos los define el usuario:
 * nombre libre + monto, y se restan del neto igual que los automáticos.
 */
interface Props {
  ingresoId: string
  descuentos: DeduccionPersonalizada[]
}

export function SeccionDescuentos({ ingresoId, descuentos }: Props) {
  const actualizarDeduccion = useIngresos((estado) => estado.actualizarDeduccion)
  const eliminarDeduccion = useIngresos((estado) => estado.eliminarDeduccion)
  const crearDeduccion = useIngresos((estado) => estado.crearDeduccion)

  const [agregando, setAgregando] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState('')

  function manejarAgregar(evento: FormEvent) {
    evento.preventDefault()
    const nombre = nombreNuevo.trim()
    if (!nombre) return
    void crearDeduccion(ingresoId, nombre, 0)
    setNombreNuevo('')
    setAgregando(false)
  }

  const totalDescontado = descuentos.reduce((suma, descuento) => suma + descuento.monto, 0)

  return (
    <div className="flex flex-col gap-3">
      {descuentos.length === 0 && !agregando && (
        <p className="text-xs text-muted">Sin descuentos personalizados por ahora.</p>
      )}

      {descuentos.map((descuento) => (
        <div key={descuento.id} className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor={`descuento-nombre-${descuento.id}`} className="sr-only">
              Nombre del descuento
            </label>
            <input
              id={`descuento-nombre-${descuento.id}`}
              value={descuento.nombre}
              onChange={(e) => actualizarDeduccion(descuento.id, { nombre: e.target.value })}
              placeholder="Nombre del descuento"
              className="h-11 w-full rounded-card border border-border bg-surface-2 px-3.5 text-sm text-text outline-none transition-colors focus:border-accent"
            />
          </div>

          <div className="w-32 sm:w-36">
            <CampoMoneda
              etiqueta={`Monto de ${descuento.nombre || 'este descuento'}`}
              ocultarEtiqueta
              valor={descuento.monto}
              onCambio={(valor) => actualizarDeduccion(descuento.id, { monto: valor })}
            />
          </div>

          <button
            type="button"
            onClick={() => void eliminarDeduccion(descuento.id)}
            aria-label={`Eliminar descuento ${descuento.nombre || 'sin nombre'}`}
            className="grid size-11 shrink-0 place-items-center rounded-card text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <IconoBasura className="size-4" />
          </button>
        </div>
      ))}

      {agregando ? (
        <form onSubmit={manejarAgregar} className="flex items-center gap-2">
          <label htmlFor="nuevo-descuento-nombre" className="sr-only">
            Nombre del nuevo descuento
          </label>
          <input
            id="nuevo-descuento-nombre"
            autoFocus
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Ej. Libranza, fondo de empleados…"
            className="h-11 flex-1 rounded-card border border-accent bg-surface px-3.5 text-sm text-text outline-none"
          />
          <Boton type="submit" tamano="sm">
            Agregar
          </Boton>
          <Boton type="button" variante="texto" tamano="sm" onClick={() => setAgregando(false)}>
            Cancelar
          </Boton>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAgregando(true)}
          className="flex items-center gap-1.5 self-start text-sm font-medium text-accent hover:underline"
        >
          <IconoMas className="size-4" />
          Agregar descuento
        </button>
      )}

      {descuentos.length > 0 && (
        <p className="border-t border-border pt-2 text-right text-xs text-muted">
          Total descontado:{' '}
          <span className="font-semibold text-danger">− {formatearCOP(totalDescontado)}</span>
        </p>
      )}
    </div>
  )
}
