import { useMemo, useState } from 'react'

import { IconoFlechaAbajo } from '@/components/ui/iconos'
import type { Bolsillo, Categoria, Concepto, SeguimientoMensual } from '@/types/basedatos'

import { FilaSeguimiento } from './FilaSeguimiento'

/**
 * La lista del mes, agrupada por categoría y dentro por bolsillo, igual que el
 * resto de la app. Solo aparecen los conceptos que tienen registro de
 * seguimiento ese mes: los que estaban en $0 cuando arrancó el mes no se
 * inventan aquí.
 */
interface Props {
  categorias: Categoria[]
  bolsillos: Bolsillo[]
  conceptosPorBolsillo: Record<string, Concepto[]>
  registros: SeguimientoMensual[]
  soloLectura?: boolean
}

export function ListaSeguimiento({
  categorias,
  bolsillos,
  conceptosPorBolsillo,
  registros,
  soloLectura = false,
}: Props) {
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set())
  // Un solo detalle desplegado a la vez, en toda la lista: abrir uno cierra el
  // anterior. Con 30 o 40 conceptos, dejar varios formularios abiertos vuelve
  // la pantalla inmanejable. Es estado visual de esta pantalla, así que vive
  // aquí y no en el store (igual que las categorías colapsadas del editor).
  const [idAbierto, setIdAbierto] = useState<string | null>(null)

  const registroPorConcepto = useMemo(() => {
    const mapa = new Map<string, SeguimientoMensual>()
    for (const registro of registros) mapa.set(registro.concepto_id, registro)
    return mapa
  }, [registros])

  // Se arma el árbol completo primero y se podan los niveles vacíos, para no
  // pintar una categoría o un bolsillo sin ninguna fila debajo.
  const grupos = useMemo(
    () =>
      categorias
        .map((categoria) => {
          const suBolsillos = bolsillos
            .filter((bolsillo) => bolsillo.categoria_id === categoria.id)
            .map((bolsillo) => ({
              bolsillo,
              filas: (conceptosPorBolsillo[bolsillo.id] ?? [])
                .map((concepto) => ({ concepto, registro: registroPorConcepto.get(concepto.id) }))
                .filter((fila): fila is { concepto: Concepto; registro: SeguimientoMensual } => Boolean(fila.registro)),
            }))
            .filter((grupo) => grupo.filas.length > 0)

          const total = suBolsillos.reduce((suma, grupo) => suma + grupo.filas.length, 0)
          const cumplidos = suBolsillos.reduce(
            (suma, grupo) => suma + grupo.filas.filter((fila) => fila.registro.cumplido === true).length,
            0,
          )

          return { categoria, suBolsillos, total, cumplidos }
        })
        .filter((grupo) => grupo.total > 0),
    [categorias, bolsillos, conceptosPorBolsillo, registroPorConcepto],
  )

  function alternar(id: string) {
    setColapsadas((actual) => {
      const siguiente = new Set(actual)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {grupos.map(({ categoria, suBolsillos, total, cumplidos }) => {
        const colapsada = colapsadas.has(categoria.id)

        return (
          <div key={categoria.id} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-3">
            <button
              type="button"
              onClick={() => alternar(categoria.id)}
              aria-expanded={!colapsada}
              className="-m-1 flex items-center gap-2 rounded-card p-1 text-left transition-colors hover:bg-surface-2"
            >
              <span aria-hidden className="size-2.5 shrink-0 rounded-pill" style={{ backgroundColor: categoria.color }} />
              <h3 className="font-display text-base font-bold text-text">{categoria.nombre}</h3>
              <span className="cifra ml-auto shrink-0 text-sm font-semibold text-muted">
                {cumplidos}/{total}
              </span>
              <IconoFlechaAbajo
                className={`size-4 shrink-0 text-muted transition-transform ${colapsada ? '' : 'rotate-180'}`}
              />
            </button>

            {!colapsada &&
              suBolsillos.map(({ bolsillo, filas }) => (
                <section key={bolsillo.id} className="flex flex-col gap-1">
                  <h4 className="font-display text-xs font-semibold tracking-wide text-muted uppercase">
                    {bolsillo.nombre}
                  </h4>
                  {filas.map(({ concepto, registro }) => (
                    <FilaSeguimiento
                      key={registro.id}
                      registro={registro}
                      nombreConcepto={concepto.nombre}
                      categoriaSlug={categoria.slug}
                      abierta={idAbierto === registro.id}
                      onAbertura={(abrir) => setIdAbierto(abrir ? registro.id : null)}
                      soloLectura={soloLectura}
                    />
                  ))}
                </section>
              ))}
          </div>
        )
      })}
    </div>
  )
}
