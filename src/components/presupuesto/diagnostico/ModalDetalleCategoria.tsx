import { Modal } from '@/components/ui/Modal'
import { normalizarAMensual, OPCIONES_FRECUENCIA } from '@/lib/finanzas'
import { formatearCOP, formatearPorcentaje } from '@/lib/formato'
import { calcularTotalBolsillo } from '@/stores/presupuesto'
import type { Bolsillo, Categoria, Concepto } from '@/types/basedatos'

/**
 * Detalle de solo lectura de una categoría: bolsillos y conceptos con su valor
 * mensual (normalizado, para cuadrar con los totales). Solo muestra conceptos
 * con monto > 0 y omite los bolsillos que queden vacíos.
 */
interface Props {
  abierto: boolean
  onCerrar: () => void
  categoria: Categoria
  real: number
  ingresos: number
  bolsillos: Bolsillo[]
  conceptosPorBolsillo: Record<string, Concepto[]>
  /** Si se pasa, el estado vacío ofrece un enlace para ir a editar. */
  onEditar?: () => void
}

const ETIQUETA_FRECUENCIA = Object.fromEntries(OPCIONES_FRECUENCIA.map((o) => [o.valor, o.etiqueta.toLowerCase()]))

export function ModalDetalleCategoria({
  abierto,
  onCerrar,
  categoria,
  real,
  ingresos,
  bolsillos,
  conceptosPorBolsillo,
  onEditar,
}: Props) {
  const grupos = bolsillos
    .filter((bolsillo) => bolsillo.categoria_id === categoria.id)
    .map((bolsillo) => {
      const conceptos = (conceptosPorBolsillo[bolsillo.id] ?? []).filter(
        (concepto) => normalizarAMensual(concepto.monto, concepto.frecuencia) > 0,
      )
      return { bolsillo, conceptos, subtotal: calcularTotalBolsillo(conceptos) }
    })
    .filter((grupo) => grupo.conceptos.length > 0)

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={categoria.nombre}>
      <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-4 scrollbar-gutter-stable">
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-card border-l-4 bg-surface-2 p-3"
          style={{ borderLeftColor: categoria.color }}
        >
          <div className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 shrink-0 rounded-pill" style={{ backgroundColor: categoria.color }} />
            <span className="text-xs text-muted">ideal {formatearPorcentaje(categoria.porcentaje_ideal / 100)}</span>
            <span className="text-xs font-semibold" style={{ color: categoria.color }}>
              vas en {formatearPorcentaje(real / ingresos)}
            </span>
          </div>
          <span className="cifra font-semibold text-text">{formatearCOP(real)}</span>
        </div>

        {grupos.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted">
            <p>Aún no has registrado montos en esta categoría</p>
            {onEditar && (
              <button
                type="button"
                onClick={() => {
                  onCerrar()
                  onEditar()
                }}
                className="mt-2 font-semibold text-accent underline-offset-2 hover:underline"
              >
                Ir a editar
              </button>
            )}
          </div>
        ) : (
          <>
            {grupos.map(({ bolsillo, conceptos, subtotal }) => (
              <section key={bolsillo.id} className="flex flex-col gap-1">
                <h3 className="font-display text-xs font-semibold tracking-wide text-muted uppercase">
                  {bolsillo.nombre}
                </h3>
                <ul className="flex flex-col divide-y divide-border">
                  {conceptos.map((concepto) => (
                    <li key={concepto.id} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                      <span className="text-text">
                        {concepto.nombre}
                        {concepto.frecuencia !== 'mes' && (
                          <span className="ml-1 text-xs text-muted">
                            ({formatearCOP(concepto.monto)} / {ETIQUETA_FRECUENCIA[concepto.frecuencia]})
                          </span>
                        )}
                      </span>
                      <span className="cifra shrink-0 text-text">
                        {formatearCOP(normalizarAMensual(concepto.monto, concepto.frecuencia))}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between border-t border-border pt-1.5 text-sm font-semibold">
                  <span className="text-muted">Subtotal</span>
                  <span className="cifra text-text">{formatearCOP(subtotal)}</span>
                </div>
              </section>
            ))}

            <div className="flex justify-between border-t border-border pt-3 font-semibold">
              <span className="text-text">Total {categoria.nombre}</span>
              <span className="cifra text-text">{formatearCOP(real)}</span>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
