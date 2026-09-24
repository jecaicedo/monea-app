import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { EncabezadoPagina } from '@/components/EncabezadoPagina'
import { ModalNuevoRecordatorio } from '@/components/recordatorios/ModalNuevoRecordatorio'
import { TarjetaRecordatorio, TarjetaRecordatorioVacia } from '@/components/recordatorios/TarjetaRecordatorio'
import { Boton } from '@/components/ui/Boton'
import { IconoCargando, IconoMas } from '@/components/ui/iconos'
import { calcularProximaOcurrencia } from '@/lib/recordatorios'
import { useRecordatorios } from '@/stores/recordatorios'

/**
 * Recordatorios: pagos, tarjetas, cumpleaños y pico y placa. Se llega desde
 * la pestaña "Otros". La lista se ordena por proximidad (vencidos y más
 * cercanos primero); cada tarjeta se distingue por color/etiqueta de estado,
 * así que no hace falta separarla en secciones.
 */
export default function Recordatorios() {
  const recordatorios = useRecordatorios((estado) => estado.recordatorios)
  const cargando = useRecordatorios((estado) => estado.cargando)
  const cargar = useRecordatorios((estado) => estado.cargar)

  const [modalAbierto, setModalAbierto] = useState(false)

  useEffect(() => {
    void cargar()
    // Se carga una sola vez al entrar; las acciones de Zustand son estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ordenados = useMemo(() => {
    return [...recordatorios].sort((a, b) => {
      const diasA = calcularProximaOcurrencia(a.fecha, a.recurrencia).diasHasta
      const diasB = calcularProximaOcurrencia(b.fecha, b.recurrencia).diasHasta
      return diasA - diasB
    })
  }, [recordatorios])

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
        titulo="Recordatorios"
        descripcion="Tus fechas de pago, tarjetas, cumpleaños y el pico y placa."
        acciones={
          <Boton tamano="sm" onClick={() => setModalAbierto(true)}>
            <IconoMas className="size-4" />
            Nuevo recordatorio
          </Boton>
        }
      />

      <Link to="/otros" className="mb-4 inline-flex text-sm font-semibold text-accent hover:underline">
        ← Otros
      </Link>

      {ordenados.length === 0 ? (
        <TarjetaRecordatorioVacia onCrear={() => setModalAbierto(true)} />
      ) : (
        <div className="flex flex-col gap-3">
          {ordenados.map((recordatorio) => (
            <TarjetaRecordatorio key={recordatorio.id} recordatorio={recordatorio} />
          ))}
        </div>
      )}

      <ModalNuevoRecordatorio abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} />
    </>
  )
}
