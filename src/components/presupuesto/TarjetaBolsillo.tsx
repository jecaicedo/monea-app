import { Acordeon } from '@/components/ui/Acordeon'
import { IconoFlechaAbajo, IconoLapiz, IconoMas } from '@/components/ui/iconos'
import { IndicadorGuardado } from '@/components/ui/IndicadorGuardado'
import { Selector } from '@/components/ui/Selector'
import { BANCOS_COLOMBIA } from '@/lib/bancos'
import { formatearCOP } from '@/lib/formato'
import { calcularTotalBolsillo, usePresupuesto } from '@/stores/presupuesto'
import type { Bolsillo, CategoriaSlug, Concepto } from '@/types/basedatos'

import { ConceptoFila } from './ConceptoFila'

/**
 * Tarjeta-acordeón de un bolsillo (reutiliza el primitivo Acordeon de la
 * Etapa 3). Contraída: nombre + total + chevron, todo clicable. Expandida:
 * el banco (solo en Ahorro con propósito) y la lista de conceptos.
 */
interface Props {
  bolsillo: Bolsillo
  conceptos: Concepto[]
  categoriaSlug: CategoriaSlug
}

const OPCIONES_BANCO = BANCOS_COLOMBIA.map((banco) => ({ valor: banco, etiqueta: banco }))
const SLUG_AHORRO: CategoriaSlug = 'ahorro-con-proposito'

export function TarjetaBolsillo({ bolsillo, conceptos, categoriaSlug }: Props) {
  const abierta = usePresupuesto((estado) => estado.idsAbiertos.has(bolsillo.id))
  const alternarBolsilloAbierto = usePresupuesto((estado) => estado.alternarBolsilloAbierto)
  const actualizarBolsillo = usePresupuesto((estado) => estado.actualizarBolsillo)
  const crearConcepto = usePresupuesto((estado) => estado.crearConcepto)
  // Un solo indicador para toda la tarjeta: con varios conceptos, un badge
  // por fila sería ruido. Se enciende si el bolsillo o cualquiera de sus
  // conceptos tiene un guardado pendiente o en curso.
  const guardando = usePresupuesto(
    (estado) => estado.guardando.has(bolsillo.id) || conceptos.some((concepto) => estado.guardando.has(concepto.id)),
  )

  const total = calcularTotalBolsillo(conceptos)
  const esAhorro = categoriaSlug === SLUG_AHORRO

  return (
    <div className="overflow-hidden rounded-panel border border-border bg-surface">
      <Acordeon
        abierta={abierta}
        claseCuerpo="border-t border-border p-4 sm:p-5"
        encabezado={
          <button
            type="button"
            onClick={() => alternarBolsilloAbierto(bolsillo.id)}
            aria-expanded={abierta}
            className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-2 sm:p-5"
          >
            <IconoFlechaAbajo
              className={`size-4 shrink-0 text-muted transition-transform ${abierta ? 'rotate-180' : ''}`}
            />
            {/* Lápiz decorativo: anticipa el renombrado de bolsillos, todavía
                sin construir (fuera de alcance de esta etapa). */}
            <IconoLapiz className="size-3.5 shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold tracking-wide text-text uppercase">
              {bolsillo.nombre}
            </span>
            <IndicadorGuardado guardando={guardando} />
            <span className="cifra shrink-0 text-base font-bold wrap-break-word text-text">
              {formatearCOP(total)}
            </span>
          </button>
        }
      >
        {esAhorro && (
          <div className="mb-4">
            <Selector
              etiqueta="¿En qué banco?"
              opciones={OPCIONES_BANCO}
              placeholder="Selecciona un banco"
              value={bolsillo.banco ?? ''}
              onChange={(e) => actualizarBolsillo(bolsillo.id, { banco: e.target.value || null })}
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
          {conceptos.length === 0 && (
            <p className="text-xs text-muted">Todavía no hay conceptos en este bolsillo.</p>
          )}
          {conceptos.map((concepto) => (
            <ConceptoFila key={concepto.id} concepto={concepto} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => void crearConcepto(bolsillo.id)}
          className="mt-3 flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          <IconoMas className="size-4" />
          Agregar concepto
        </button>
      </Acordeon>
    </div>
  )
}
