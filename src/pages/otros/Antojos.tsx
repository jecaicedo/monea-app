import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ModalNuevoAntojo } from '@/components/antojos/ModalNuevoAntojo'
import { TarjetaAntojo, TarjetaAntojoVacia } from '@/components/antojos/TarjetaAntojo'
import { EncabezadoPagina } from '@/components/EncabezadoPagina'
import { Boton } from '@/components/ui/Boton'
import { IconoCargando, IconoMas } from '@/components/ui/iconos'
import { formatearCOP } from '@/lib/formato'
import { useAntojos } from '@/stores/antojos'
import { calcularTotalIngresosNetos, useIngresos } from '@/stores/ingresos'
import { calcularTotalAhorro, calcularTotalGastos, usePresupuesto } from '@/stores/presupuesto'

/**
 * Antojos: "tómale foto a lo que quieres y mira en cuánto tiempo te alcanza".
 * Se llega desde la pestaña "Otros". El excedente es el mismo que ya calculan
 * Metas y el diagnóstico de Revisa (ingresos − gastos − ahorro).
 */
export default function Antojos() {
  const ingresos = useIngresos((estado) => estado.ingresos)
  const deducciones = useIngresos((estado) => estado.deducciones)
  const cargandoIngresos = useIngresos((estado) => estado.cargando)
  const cargarIngresos = useIngresos((estado) => estado.cargar)

  const categorias = usePresupuesto((estado) => estado.categorias)
  const bolsillos = usePresupuesto((estado) => estado.bolsillos)
  const conceptosPorBolsillo = usePresupuesto((estado) => estado.conceptosPorBolsillo)
  const cargandoPresupuesto = usePresupuesto((estado) => estado.cargando)
  const cargarPresupuesto = usePresupuesto((estado) => estado.cargar)

  const antojos = useAntojos((estado) => estado.antojos)
  const urlsFirmadas = useAntojos((estado) => estado.urlsFirmadas)
  const cargandoAntojos = useAntojos((estado) => estado.cargando)
  const errorAntojos = useAntojos((estado) => estado.error)
  const cargarAntojos = useAntojos((estado) => estado.cargar)

  const [modalAbierto, setModalAbierto] = useState(false)

  useEffect(() => {
    void cargarIngresos()
    void cargarPresupuesto()
    void cargarAntojos()
    // Se carga una sola vez al entrar; las acciones de Zustand son estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalIngresos = calcularTotalIngresosNetos(ingresos, deducciones)
  const totalGastos = useMemo(
    () => calcularTotalGastos(categorias, bolsillos, conceptosPorBolsillo),
    [categorias, bolsillos, conceptosPorBolsillo],
  )
  const totalAhorro = useMemo(
    () => calcularTotalAhorro(categorias, bolsillos, conceptosPorBolsillo),
    [categorias, bolsillos, conceptosPorBolsillo],
  )
  const excedente = totalIngresos - totalGastos - totalAhorro

  const cargando = cargandoIngresos || cargandoPresupuesto || cargandoAntojos

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
        titulo="Antojos"
        descripcion="Tómale foto a lo que quieres y mira en cuánto tiempo te alcanza."
        acciones={
          <Boton tamano="sm" onClick={() => setModalAbierto(true)}>
            <IconoMas className="size-4" />
            Nuevo antojo
          </Boton>
        }
      />

      <Link to="/otros" className="mb-4 inline-flex text-sm font-semibold text-accent hover:underline">
        ← Otros
      </Link>

      <p className="mb-5 text-sm text-muted">
        Te sobran{' '}
        <span className="cifra font-semibold text-text">{formatearCOP(Math.max(excedente, 0))}</span> al mes con tu
        presupuesto actual.
      </p>

      {errorAntojos && (
        <p role="alert" className="mb-5 rounded-card bg-danger-soft p-3 text-sm text-danger">
          {errorAntojos}
        </p>
      )}

      {antojos.length === 0 ? (
        <TarjetaAntojoVacia onCrear={() => setModalAbierto(true)} />
      ) : (
        <div className="flex flex-col gap-3">
          {antojos.map((antojo) => (
            <TarjetaAntojo
              key={antojo.id}
              antojo={antojo}
              urlFoto={antojo.foto_path ? urlsFirmadas[antojo.foto_path] : undefined}
              excedenteMensual={excedente}
            />
          ))}
        </div>
      )}

      <ModalNuevoAntojo abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} />
    </>
  )
}
