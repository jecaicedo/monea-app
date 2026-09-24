import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Boton } from '@/components/ui/Boton'
import { IconoEscudo } from '@/components/ui/iconos'
import { IndicadorGuardado } from '@/components/ui/IndicadorGuardado'
import { SeccionExpandible } from '@/components/ui/SeccionExpandible'
import { Selector } from '@/components/ui/Selector'
import { BANCOS_COLOMBIA } from '@/lib/bancos'
import { normalizarAMensual } from '@/lib/finanzas'
import { formatearCOP } from '@/lib/formato'
import { calcularTotalBolsillo, usePresupuesto } from '@/stores/presupuesto'
import type { Bolsillo, Categoria, Concepto } from '@/types/basedatos'

const OPCIONES_BANCO = BANCOS_COLOMBIA.map((banco) => ({ valor: banco, etiqueta: banco }))

/**
 * Un bolsillo del presupuesto, presentado como "sobre": nombre, categoría,
 * monto y banco siempre visibles (es el propósito de esta pantalla); la
 * lista de conceptos es opcional y de solo lectura — para editar montos hay
 * que ir a Revisa. Nombre y banco se autoguardan con `actualizarBolsillo`,
 * el MISMO registro que edita el editor de presupuesto (una sola fuente de
 * verdad).
 */
interface Props {
  bolsillo: Bolsillo
  categoria: Categoria
  conceptos: Concepto[]
}

export function TarjetaBolsilloSobre({ bolsillo, categoria, conceptos }: Props) {
  const actualizarBolsillo = usePresupuesto((estado) => estado.actualizarBolsillo)
  const guardando = usePresupuesto((estado) => estado.guardando.has(bolsillo.id))
  const [conceptosAbiertos, setConceptosAbiertos] = useState(false)

  const total = calcularTotalBolsillo(conceptos)

  return (
    <div className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <label htmlFor={`bolsillo-nombre-${bolsillo.id}`} className="sr-only">
          Nombre del bolsillo
        </label>
        <input
          id={`bolsillo-nombre-${bolsillo.id}`}
          value={bolsillo.nombre}
          onChange={(e) => actualizarBolsillo(bolsillo.id, { nombre: e.target.value })}
          placeholder="Nombre del bolsillo"
          className="min-w-0 flex-1 truncate bg-transparent font-display text-base font-semibold text-text outline-none"
        />
        <IndicadorGuardado guardando={guardando} />
        <span className="cifra shrink-0 text-base font-bold wrap-break-word text-text">{formatearCOP(total)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden className="size-2.5 shrink-0 rounded-pill" style={{ backgroundColor: categoria.color }} />
        <span className="text-xs font-medium text-muted">{categoria.nombre}</span>

        {bolsillo.es_fondo_emergencia && (
          <span className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
            <IconoEscudo className="size-3" />
            Fondo de emergencia
          </span>
        )}
      </div>

      <Selector
        etiqueta="Banco"
        opciones={OPCIONES_BANCO}
        placeholder="Selecciona un banco"
        value={bolsillo.banco ?? ''}
        onChange={(e) => actualizarBolsillo(bolsillo.id, { banco: e.target.value || null })}
      />

      <SeccionExpandible
        titulo="Ver conceptos"
        subtitulo={`${conceptos.length} concepto${conceptos.length === 1 ? '' : 's'}`}
        abierta={conceptosAbiertos}
        onAlternar={() => setConceptosAbiertos((valor) => !valor)}
      >
        <div className="flex flex-col gap-2">
          {conceptos.length === 0 ? (
            <p className="text-xs text-muted">Este bolsillo todavía no tiene conceptos.</p>
          ) : (
            conceptos.map((concepto) => (
              <div key={concepto.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-text">{concepto.nombre}</span>
                <span className="cifra shrink-0 wrap-break-word font-medium text-muted">
                  {formatearCOP(normalizarAMensual(concepto.monto, concepto.frecuencia))}
                </span>
              </div>
            ))
          )}
          <Link
            to="/presupuesto/revisa"
            className="mt-1 inline-flex text-sm font-semibold text-accent hover:underline"
          >
            Editar montos en Revisa →
          </Link>
        </div>
      </SeccionExpandible>
    </div>
  )
}

/** Tarjeta que se muestra cuando el usuario todavía no tiene ningún bolsillo. */
export function TarjetaBolsilloVacio({ onCrear }: { onCrear: () => void }) {
  return (
    <div className="rounded-panel border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
      <p className="text-sm font-medium text-text">Todavía no tienes bolsillos</p>
      <p className="mx-auto mt-2 max-w-xs text-xs text-muted">
        Crea tu primer bolsillo para empezar a organizar tu plata por destino.
      </p>
      <Boton className="mt-5" onClick={onCrear}>
        Añadir mi primer bolsillo
      </Boton>
    </div>
  )
}
