import { useEffect, useMemo } from 'react'

import { BarraResumenIngresos } from '@/components/ingresos/BarraResumenIngresos'
import { TarjetaIngreso, TarjetaIngresoVacia } from '@/components/ingresos/TarjetaIngreso'
import { Boton } from '@/components/ui/Boton'
import { IconoCargando, IconoMas } from '@/components/ui/iconos'
import { formatearCOP } from '@/lib/formato'
import { calcularTotalIngresosNetos, useIngresos } from '@/stores/ingresos'
import { calcularTotalAhorro, calcularTotalGastos, usePresupuesto } from '@/stores/presupuesto'

/**
 * Sub-pestaña "Actualiza" del presupuesto: SOLO edición de ingresos (el
 * editor de categorías/bolsillos/conceptos vive en "Revisa"). La barra de
 * resumen se queda aquí y sigue mostrando Gastos/Ahorro leyendo el store de
 * presupuesto, aunque esa edición no ocurra en esta pantalla. Todo se
 * autoguarda; no hay botón de guardar (ver src/stores/ingresos.ts).
 */
export default function Actualiza() {
  const ingresos = useIngresos((estado) => estado.ingresos)
  const deducciones = useIngresos((estado) => estado.deducciones)
  const cargandoIngresos = useIngresos((estado) => estado.cargando)
  const errorIngresos = useIngresos((estado) => estado.error)
  const cargarIngresos = useIngresos((estado) => estado.cargar)
  const crearIngreso = useIngresos((estado) => estado.crearIngreso)

  const categorias = usePresupuesto((estado) => estado.categorias)
  const bolsillos = usePresupuesto((estado) => estado.bolsillos)
  const conceptosPorBolsillo = usePresupuesto((estado) => estado.conceptosPorBolsillo)
  const cargarPresupuesto = usePresupuesto((estado) => estado.cargar)

  useEffect(() => {
    void cargarIngresos()
    // El editor de presupuesto ya no se monta en esta pantalla, así que esta
    // pantalla debe cargar ese store por su cuenta para poder mostrar
    // Gastos/Ahorro en la barra de resumen.
    void cargarPresupuesto()
    // Se carga una sola vez al entrar a la pantalla; ambas acciones son
    // estables (vienen de Zustand, no cambian entre renders).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalMensual = calcularTotalIngresosNetos(ingresos, deducciones)

  const totalGastos = useMemo(
    () => calcularTotalGastos(categorias, bolsillos, conceptosPorBolsillo),
    [categorias, bolsillos, conceptosPorBolsillo],
  )
  const totalAhorro = useMemo(
    () => calcularTotalAhorro(categorias, bolsillos, conceptosPorBolsillo),
    [categorias, bolsillos, conceptosPorBolsillo],
  )

  if (cargandoIngresos) {
    return (
      <div className="grid place-items-center py-24 text-muted">
        <IconoCargando className="size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <BarraResumenIngresos
        ingresos={ingresos}
        deducciones={deducciones}
        totalGastos={totalGastos}
        totalAhorro={totalAhorro}
      />

      {errorIngresos && (
        <p role="alert" className="rounded-card bg-danger-soft p-3 text-sm text-danger">
          {errorIngresos}
        </p>
      )}

      <section className="flex flex-col gap-6">
        <h2 className="font-display text-sm font-semibold tracking-wide text-muted uppercase">Tus ingresos</h2>

        {ingresos.length === 0 ? (
          <TarjetaIngresoVacia onCrear={() => void crearIngreso()} />
        ) : (
          <div className="flex flex-col gap-5">
            {ingresos.map((ingreso) => (
              <TarjetaIngreso key={ingreso.id} ingreso={ingreso} descuentos={deducciones[ingreso.id] ?? []} />
            ))}
          </div>
        )}

        {ingresos.length > 0 && (
          <>
            <Boton variante="secundario" anchoCompleto onClick={() => void crearIngreso()}>
              <IconoMas className="size-4" />
              Agregar otro ingreso
            </Boton>

            <p className="text-center text-sm text-muted">
              Total que te entra al mes:{' '}
              <span className="cifra font-semibold text-text">{formatearCOP(totalMensual)}</span>
            </p>
          </>
        )}
      </section>
    </div>
  )
}
