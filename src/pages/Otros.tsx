import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ComponentType, SVGProps } from 'react'

import { EncabezadoPagina } from '@/components/EncabezadoPagina'
import { IconoCampana, IconoFlechaAbajo, IconoInforme, IconoPresupuesto, IconoRegalo } from '@/components/ui/iconos'
import { calcularEstadoProximidad, calcularProximaOcurrencia } from '@/lib/recordatorios'
import { useRecordatorios } from '@/stores/recordatorios'

interface PropsTarjetaAcceso {
  to: string
  Icono: ComponentType<SVGProps<SVGSVGElement>>
  titulo: string
  descripcion: string
  /** Punto rojo cuando hay algo urgente pendiente (ej. recordatorios vencidos). */
  conAviso?: boolean
}

function TarjetaAcceso({ to, Icono, titulo, descripcion, conAviso = false }: PropsTarjetaAcceso) {
  return (
    <Link
      to={to}
      className="mb-4 flex items-center gap-3 rounded-panel border border-border bg-surface p-4 transition-colors hover:bg-surface-2"
    >
      <span className="relative grid size-10 shrink-0 place-items-center rounded-card bg-accent-soft text-accent">
        <Icono className="size-5" />
        {conAviso && (
          <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2.5 rounded-pill bg-danger-fill" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-semibold text-text">{titulo}</span>
        <span className="block text-xs text-muted">{descripcion}</span>
      </span>
      <IconoFlechaAbajo className="size-4 shrink-0 -rotate-90 text-muted" />
    </Link>
  )
}

/** Otros: antojos, recordatorios, ingresos y ajustes. */
export default function Otros() {
  const recordatorios = useRecordatorios((estado) => estado.recordatorios)
  const cargarRecordatorios = useRecordatorios((estado) => estado.cargar)

  useEffect(() => {
    void cargarRecordatorios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hayVencidos = useMemo(
    () =>
      recordatorios.some((r) => {
        const { diasHasta } = calcularProximaOcurrencia(r.fecha, r.recurrencia)
        return calcularEstadoProximidad(diasHasta) === 'vencido'
      }),
    [recordatorios],
  )

  return (
    <>
      <EncabezadoPagina titulo="Otros" descripcion="Tu presupuesto, tus antojos, tus recordatorios y tu informe." />

      <TarjetaAcceso
        to="/presupuesto"
        Icono={IconoPresupuesto}
        titulo="Tu presupuesto"
        descripcion="Ingresos, categorías y bolsillos: arma y revisa tu plan"
      />

      <TarjetaAcceso
        to="/otros/antojos"
        Icono={IconoRegalo}
        titulo="Antojos"
        descripcion="Mira en cuánto tiempo te alcanza para lo que quieres"
      />

      <TarjetaAcceso
        to="/otros/recordatorios"
        Icono={IconoCampana}
        titulo="Recordatorios"
        descripcion="Pagos, tarjetas, cumpleaños y pico y placa"
        conAviso={hayVencidos}
      />

      <TarjetaAcceso
        to="/otros/informe"
        Icono={IconoInforme}
        titulo="Descargar tu informe"
        descripcion="Un PDF con el resumen completo de tu presupuesto"
      />
    </>
  )
}
