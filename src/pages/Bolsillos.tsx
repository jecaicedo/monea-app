import { useEffect, useMemo, useState } from 'react'

import { TarjetaBolsilloSobre, TarjetaBolsilloVacio } from '@/components/bolsillos/TarjetaBolsilloSobre'
import { EncabezadoPagina } from '@/components/EncabezadoPagina'
import { ModalNuevoBolsillo } from '@/components/presupuesto/ModalNuevoBolsillo'
import { Boton } from '@/components/ui/Boton'
import { IconoBolsillos, IconoCargando, IconoMas } from '@/components/ui/iconos'
import { BANCOS_COLOMBIA } from '@/lib/bancos'
import { formatearCOP } from '@/lib/formato'
import { calcularTotalBolsillo, usePresupuesto } from '@/stores/presupuesto'
import type { Bolsillo } from '@/types/basedatos'

const SIN_BANCO = 'Sin banco asignado'

type Vista = 'categoria' | 'banco'

/**
 * Bolsillos: los MISMOS bolsillos del presupuesto, presentados como sobres
 * por destino. Una sola fuente de verdad — editar aquí es editar el mismo
 * registro que usa el editor de presupuesto en Revisa (mismo store).
 */
export default function Bolsillos() {
  const categorias = usePresupuesto((estado) => estado.categorias)
  const bolsillos = usePresupuesto((estado) => estado.bolsillos)
  const conceptosPorBolsillo = usePresupuesto((estado) => estado.conceptosPorBolsillo)
  const cargando = usePresupuesto((estado) => estado.cargando)
  const cargar = usePresupuesto((estado) => estado.cargar)

  useEffect(() => {
    void cargar()
    // Se carga una sola vez al entrar; por si esta es la primera pantalla
    // que visita el usuario en la sesión (el store es compartido con Revisa).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [vista, setVista] = useState<Vista>('categoria')
  const [modalAbierto, setModalAbierto] = useState(false)

  const categoriaPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias])

  const totalesPorBolsillo = useMemo(() => {
    const totales: Record<string, number> = {}
    for (const bolsillo of bolsillos) {
      totales[bolsillo.id] = calcularTotalBolsillo(conceptosPorBolsillo[bolsillo.id] ?? [])
    }
    return totales
  }, [bolsillos, conceptosPorBolsillo])

  const totalGeneral = Object.values(totalesPorBolsillo).reduce((suma, monto) => suma + monto, 0)

  // Vista "por categoría": una sección por cada categoría que tenga bolsillos.
  const gruposPorCategoria = useMemo(() => {
    return categorias
      .map((categoria) => ({
        clave: categoria.id,
        nombre: categoria.nombre,
        color: categoria.color,
        bolsillos: bolsillos.filter((b) => b.categoria_id === categoria.id),
      }))
      .filter((grupo) => grupo.bolsillos.length > 0)
  }, [categorias, bolsillos])

  // Vista "por banco": agrupados por el banco asignado, en el orden de
  // BANCOS_COLOMBIA; los que no tienen banco van al final, aparte.
  const gruposPorBanco = useMemo(() => {
    const porBanco = new Map<string, Bolsillo[]>()
    for (const bolsillo of bolsillos) {
      const clave = bolsillo.banco ?? SIN_BANCO
      const lista = porBanco.get(clave) ?? []
      lista.push(bolsillo)
      porBanco.set(clave, lista)
    }

    const orden = [...BANCOS_COLOMBIA, SIN_BANCO]
    return orden
      .filter((nombre) => porBanco.has(nombre))
      .map((nombre) => ({ clave: nombre, nombre, bolsillos: porBanco.get(nombre)! }))
  }, [bolsillos])

  function totalDeGrupo(bolsillosDelGrupo: Bolsillo[]): number {
    return bolsillosDelGrupo.reduce((suma, bolsillo) => suma + (totalesPorBolsillo[bolsillo.id] ?? 0), 0)
  }

  if (cargando) {
    return (
      <div className="grid place-items-center py-24 text-muted">
        <IconoCargando className="size-6 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Bolsillos"
        descripcion="Organiza tu plata por destino y lleva el control sin nube mental."
        acciones={
          <Boton tamano="sm" onClick={() => setModalAbierto(true)}>
            <IconoMas className="size-4" />
            Añadir bolsillo
          </Boton>
        }
      />

      {bolsillos.length === 0 ? (
        <TarjetaBolsilloVacio onCrear={() => setModalAbierto(true)} />
      ) : (
        <>
          <p className="mb-5 text-sm text-muted">
            <span className="font-semibold text-text">{bolsillos.length}</span> bolsillo
            {bolsillos.length === 1 ? '' : 's'} ·{' '}
            <span className="cifra font-semibold text-text">{formatearCOP(totalGeneral)}</span> al mes
          </p>

          <div
            role="tablist"
            aria-label="Cómo agrupar los bolsillos"
            className="mb-6 inline-flex gap-1 rounded-pill border border-border bg-surface-2 p-1"
          >
            {(
              [
                { valor: 'categoria', etiqueta: 'Por categoría' },
                { valor: 'banco', etiqueta: 'Por banco' },
              ] as const
            ).map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                role="tab"
                aria-selected={vista === opcion.valor}
                onClick={() => setVista(opcion.valor)}
                className={[
                  'rounded-pill px-4 py-2 text-sm font-semibold transition-colors',
                  vista === opcion.valor ? 'bg-accent-fill text-on-accent' : 'text-muted hover:text-text',
                ].join(' ')}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>

          {vista === 'categoria' ? (
            <div className="flex flex-col gap-6">
              {gruposPorCategoria.map((grupo) => (
                <div key={grupo.clave} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="size-2.5 shrink-0 rounded-pill" style={{ backgroundColor: grupo.color }} />
                    <h2 className="font-display text-base font-bold text-text">{grupo.nombre}</h2>
                    <span className="cifra ml-auto shrink-0 text-sm font-semibold wrap-break-word text-muted">
                      {formatearCOP(totalDeGrupo(grupo.bolsillos))}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {grupo.bolsillos.map((bolsillo) => (
                      <TarjetaBolsilloSobre
                        key={bolsillo.id}
                        bolsillo={bolsillo}
                        categoria={categoriaPorId.get(bolsillo.categoria_id)!}
                        conceptos={conceptosPorBolsillo[bolsillo.id] ?? []}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {gruposPorBanco.map((grupo) => (
                <div key={grupo.clave} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <IconoBolsillos className="size-4 shrink-0 text-muted" />
                    <h2 className="font-display text-base font-bold text-text">{grupo.nombre}</h2>
                    <span className="cifra ml-auto shrink-0 text-sm font-semibold wrap-break-word text-muted">
                      {formatearCOP(totalDeGrupo(grupo.bolsillos))}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {grupo.bolsillos.map((bolsillo) => (
                      <TarjetaBolsilloSobre
                        key={bolsillo.id}
                        bolsillo={bolsillo}
                        categoria={categoriaPorId.get(bolsillo.categoria_id)!}
                        conceptos={conceptosPorBolsillo[bolsillo.id] ?? []}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ModalNuevoBolsillo
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        categorias={categorias}
        categoriaIdInicial={null}
      />
    </>
  )
}
