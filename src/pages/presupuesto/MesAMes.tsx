import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { ListaSeguimiento } from '@/components/presupuesto/seguimiento/ListaSeguimiento'
import { ResumenCumplimiento } from '@/components/presupuesto/seguimiento/ResumenCumplimiento'
import { SelectorMes } from '@/components/presupuesto/seguimiento/SelectorMes'
import { IconoCargando } from '@/components/ui/iconos'
import { calcularCumplimiento, esPeriodoEnCurso, esPeriodoFuturo, periodoActual } from '@/lib/seguimiento'
import { usePresupuesto } from '@/stores/presupuesto'
import { useSeguimientoMensual } from '@/stores/seguimientoMensual'

/**
 * Sub-pestaña "Mes a mes": el registro de si los gastos PROYECTADOS del
 * presupuesto se cumplieron realmente cada mes.
 *
 * Es un sistema paralelo a Revisa: comparte la lista de conceptos solo como
 * referencia (de ahí que cargue el store de presupuesto para saber nombres,
 * bolsillos y categorías), pero lo que se marca aquí no altera ningún número
 * del presupuesto, del diagnóstico ni de las metas.
 *
 * Las filas del mes las crea el backend al entrar, con la RPC
 * inicializar_seguimiento_mes(): ver el store.
 */
export default function MesAMes() {
  const categorias = usePresupuesto((estado) => estado.categorias)
  const bolsillos = usePresupuesto((estado) => estado.bolsillos)
  const conceptosPorBolsillo = usePresupuesto((estado) => estado.conceptosPorBolsillo)
  const cargandoPresupuesto = usePresupuesto((estado) => estado.cargando)
  const cargarPresupuesto = usePresupuesto((estado) => estado.cargar)

  const anio = useSeguimientoMensual((estado) => estado.anio)
  const mes = useSeguimientoMensual((estado) => estado.mes)
  const registros = useSeguimientoMensual((estado) => estado.registros)
  const cargandoSeguimiento = useSeguimientoMensual((estado) => estado.cargando)
  const error = useSeguimientoMensual((estado) => estado.error)
  const cargarSeguimiento = useSeguimientoMensual((estado) => estado.cargar)

  // Al entrar siempre se abre en el mes actual, aunque el store recuerde otro
  // de una visita anterior: lo normal es venir a marcar el mes en curso.
  useEffect(() => {
    const hoy = periodoActual()
    void cargarPresupuesto()
    void cargarSeguimiento(hoy.anio, hoy.mes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cumplimiento = useMemo(() => calcularCumplimiento(registros), [registros])
  const esFuturo = esPeriodoFuturo(anio, mes)
  const esEnCurso = esPeriodoEnCurso(anio, mes)
  const cargando = cargandoPresupuesto || cargandoSeguimiento

  return (
    <div className="flex flex-col gap-5">
      <SelectorMes
        anio={anio}
        mes={mes}
        cargando={cargando}
        onCambiar={(nuevoAnio, nuevoMes) => void cargarSeguimiento(nuevoAnio, nuevoMes)}
      />

      {error && (
        <p role="alert" className="rounded-card bg-danger-soft p-3 text-sm text-danger">
          {error}
        </p>
      )}

      {cargando ? (
        <div className="grid place-items-center py-12 text-muted">
          <IconoCargando className="size-6 animate-spin" />
        </div>
      ) : esFuturo ? (
        <p className="rounded-card border border-border bg-surface p-6 text-center text-sm text-muted">
          Este mes todavía no llega. Vas a poder marcar el cumplimiento cuando empiece.
        </p>
      ) : registros.length === 0 ? (
        <p className="rounded-card border border-border bg-surface p-6 text-center text-sm text-muted">
          {esEnCurso ? (
            <>
              Este mes todavía no tiene conceptos que seguir. Ponles monto en{' '}
              <Link to="/presupuesto/revisa" className="font-semibold text-accent hover:underline">
                Revisa
              </Link>{' '}
              y aparecerán aquí.
            </>
          ) : (
            'No hay registro de este mes. Solo se guarda el seguimiento de los meses que viviste con la app.'
          )}
        </p>
      ) : (
        <>
          <ResumenCumplimiento cumplimiento={cumplimiento} />
          <ListaSeguimiento
            categorias={categorias}
            bolsillos={bolsillos}
            conceptosPorBolsillo={conceptosPorBolsillo}
            registros={registros}
          />
        </>
      )}
    </div>
  )
}
