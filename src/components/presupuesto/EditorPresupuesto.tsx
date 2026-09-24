import { useMemo, useState } from 'react'

import { Boton } from '@/components/ui/Boton'
import { IconoFlechaAbajo, IconoMas } from '@/components/ui/iconos'
import { formatearCOP } from '@/lib/formato'
import { calcularTotalesPorCategoria, usePresupuesto } from '@/stores/presupuesto'

import { ChipsCategorias } from './ChipsCategorias'
import { ModalNuevoBolsillo } from './ModalNuevoBolsillo'
import { TarjetaBolsillo } from './TarjetaBolsillo'

interface Props {
  /** Solo para el chip informativo de Ingresos; no se edita desde aquí. */
  totalIngresos: number
}

/**
 * Editor de presupuesto por categorías: chips arriba, categorías-acordeón
 * (cada una con sus bolsillos-acordeón dentro) debajo, navegación ‹ / › al
 * pie. Vive dentro del modo edición de la sub-pestaña "Revisa"; quien lo
 * monta (`Revisa.tsx`) ya se encargó de cargar el store de presupuesto, así
 * que este componente asume los datos listos.
 */
export function EditorPresupuesto({ totalIngresos }: Props) {
  const categorias = usePresupuesto((estado) => estado.categorias)
  const bolsillos = usePresupuesto((estado) => estado.bolsillos)
  const conceptosPorBolsillo = usePresupuesto((estado) => estado.conceptosPorBolsillo)
  const error = usePresupuesto((estado) => estado.error)

  // null = chip "Todas" activo.
  const [categoriaActivaId, setCategoriaActivaId] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  // Qué categorías están contraídas (ocultan sus bolsillos). Es solo un
  // detalle visual de esta pantalla, así que vive aquí y no en el store.
  const [categoriasColapsadas, setCategoriasColapsadas] = useState<Set<string>>(new Set())

  function alternarCategoriaColapsada(id: string) {
    setCategoriasColapsadas((actual) => {
      const siguiente = new Set(actual)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  const totalesPorCategoria = useMemo(
    () => calcularTotalesPorCategoria(categorias, bolsillos, conceptosPorBolsillo),
    [categorias, bolsillos, conceptosPorBolsillo],
  )

  const categoriasAMostrar = categoriaActivaId ? categorias.filter((c) => c.id === categoriaActivaId) : categorias
  const indiceActual = categorias.findIndex((c) => c.id === categoriaActivaId)
  const anterior = indiceActual > 0 ? categorias[indiceActual - 1] : null
  const siguiente = indiceActual >= 0 && indiceActual < categorias.length - 1 ? categorias[indiceActual + 1] : null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <Boton tamano="sm" variante="secundario" onClick={() => setModalAbierto(true)}>
          <IconoMas className="size-4" />
          Añadir bolsillo
        </Boton>
      </div>

      <ChipsCategorias
        totalIngresos={totalIngresos}
        categorias={categorias}
        totalesPorCategoria={totalesPorCategoria}
        categoriaActivaId={categoriaActivaId}
        onSeleccionar={setCategoriaActivaId}
      />

      {error && (
        <p role="alert" className="rounded-card bg-danger-soft p-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {categoriasAMostrar.map((categoria) => {
          const bolsillosDeLaCategoria = bolsillos.filter((b) => b.categoria_id === categoria.id)
          const colapsada = categoriasColapsadas.has(categoria.id)

          return (
            <div key={categoria.id} className="flex flex-col gap-3">
              {/* Encabezado de la categoría: siempre visible (sea "Todas" o
                  una sola activa), y se puede contraer para ocultar sus
                  bolsillos sin perder su lugar en la lista. */}
              <button
                type="button"
                onClick={() => alternarCategoriaColapsada(categoria.id)}
                aria-expanded={!colapsada}
                className="-m-2 flex items-center gap-2 rounded-card p-2 text-left transition-colors hover:bg-surface-2"
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-pill"
                  style={{ backgroundColor: categoria.color }}
                />
                <h3 className="font-display text-base font-bold text-text">{categoria.nombre}</h3>
                <span className="cifra ml-auto shrink-0 text-sm font-semibold wrap-break-word text-text">
                  {formatearCOP(totalesPorCategoria[categoria.id] ?? 0)}
                </span>
                <IconoFlechaAbajo
                  className={`size-4 shrink-0 text-muted transition-transform ${colapsada ? '' : 'rotate-180'}`}
                />
              </button>

              {!colapsada &&
                (bolsillosDeLaCategoria.length === 0 ? (
                  <p className="text-sm text-muted">Todavía no tienes bolsillos en esta categoría.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {bolsillosDeLaCategoria.map((bolsillo) => (
                      <TarjetaBolsillo
                        key={bolsillo.id}
                        bolsillo={bolsillo}
                        conceptos={conceptosPorBolsillo[bolsillo.id] ?? []}
                        categoriaSlug={categoria.slug}
                      />
                    ))}
                  </div>
                ))}
            </div>
          )
        })}
      </div>

      {/* Navegar entre categorías solo tiene sentido con una específica activa. */}
      {categoriaActivaId !== null && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <Boton
            variante="secundario"
            tamano="sm"
            disabled={!anterior}
            onClick={() => anterior && setCategoriaActivaId(anterior.id)}
          >
            ‹ {anterior?.nombre ?? 'Anterior'}
          </Boton>
          <Boton
            variante="secundario"
            tamano="sm"
            disabled={!siguiente}
            onClick={() => siguiente && setCategoriaActivaId(siguiente.id)}
          >
            {siguiente?.nombre ?? 'Siguiente'} ›
          </Boton>
        </div>
      )}

      <ModalNuevoBolsillo
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        categorias={categorias}
        categoriaIdInicial={categoriaActivaId}
      />
    </div>
  )
}
