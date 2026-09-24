import { useEffect, useMemo, useState } from 'react'

import { BarraResumenIngresos } from '@/components/ingresos/BarraResumenIngresos'
import { EditorPresupuesto } from '@/components/presupuesto/EditorPresupuesto'
import { TableroDiagnostico } from '@/components/presupuesto/diagnostico/TableroDiagnostico'
import { Boton } from '@/components/ui/Boton'
import { IconoCargando } from '@/components/ui/iconos'
import { calcularTotalIngresosNetos, useIngresos } from '@/stores/ingresos'
import {
  calcularTotalAhorro,
  calcularTotalesPorCategoria,
  calcularTotalGastos,
  usePresupuesto,
} from '@/stores/presupuesto'

/**
 * Sub-pestaña "Revisa" del presupuesto: por defecto muestra el tablero de
 * diagnóstico (solo lectura); el botón "Editar" alterna al editor por
 * categorías (bolsillos y conceptos), ya construido. Ambos modos comparten
 * la misma barra de resumen y los mismos stores, así que alternar entre uno
 * y otro es instantáneo y no pierde nada de lo editado.
 *
 * Los ingresos aparecen aquí solo de forma agregada (dentro de la barra,
 * cifra "Ingresos"); la edición real de ingresos vive únicamente en
 * "Actualiza".
 */
export default function Revisa() {
  const ingresos = useIngresos((estado) => estado.ingresos)
  const deducciones = useIngresos((estado) => estado.deducciones)
  const cargandoIngresos = useIngresos((estado) => estado.cargando)
  const cargarIngresos = useIngresos((estado) => estado.cargar)

  const categorias = usePresupuesto((estado) => estado.categorias)
  const bolsillos = usePresupuesto((estado) => estado.bolsillos)
  const conceptosPorBolsillo = usePresupuesto((estado) => estado.conceptosPorBolsillo)
  const cargandoPresupuesto = usePresupuesto((estado) => estado.cargando)
  const cargarPresupuesto = usePresupuesto((estado) => estado.cargar)

  // Se carga una sola vez al entrar a la pantalla; alternar el modo más abajo
  // NO vuelve a llamar esto, así el toggle Editar/Listo es instantáneo.
  useEffect(() => {
    void cargarIngresos()
    void cargarPresupuesto()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [modoEdicion, setModoEdicion] = useState(false)

  const totalIngresos = calcularTotalIngresosNetos(ingresos, deducciones)
  const totalGastos = useMemo(
    () => calcularTotalGastos(categorias, bolsillos, conceptosPorBolsillo),
    [categorias, bolsillos, conceptosPorBolsillo],
  )
  const totalAhorro = useMemo(
    () => calcularTotalAhorro(categorias, bolsillos, conceptosPorBolsillo),
    [categorias, bolsillos, conceptosPorBolsillo],
  )
  const totalesPorCategoria = useMemo(
    () => calcularTotalesPorCategoria(categorias, bolsillos, conceptosPorBolsillo),
    [categorias, bolsillos, conceptosPorBolsillo],
  )

  if (cargandoIngresos || cargandoPresupuesto) {
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

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-semibold tracking-wide text-muted uppercase">Tu presupuesto</h2>
        <Boton
          tamano="sm"
          variante={modoEdicion ? 'principal' : 'secundario'}
          aria-pressed={modoEdicion}
          onClick={() => setModoEdicion((valor) => !valor)}
        >
          {modoEdicion ? 'Listo' : 'Editar'}
        </Boton>
      </div>

      {modoEdicion ? (
        <EditorPresupuesto totalIngresos={totalIngresos} />
      ) : (
        <TableroDiagnostico
          categorias={categorias}
          bolsillos={bolsillos}
          conceptosPorBolsillo={conceptosPorBolsillo}
          totalesPorCategoria={totalesPorCategoria}
          totalIngresos={totalIngresos}
          totalGastos={totalGastos}
          totalAhorro={totalAhorro}
        />
      )}
    </div>
  )
}
