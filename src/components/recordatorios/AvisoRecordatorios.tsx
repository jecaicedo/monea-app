import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { IconoCampana } from '@/components/ui/iconos'
import { calcularEstadoProximidad, calcularProximaOcurrencia } from '@/lib/recordatorios'
import { useRecordatorios } from '@/stores/recordatorios'

/**
 * Aviso discreto para la pantalla de Inicio (Metas): solo aparece si hay
 * recordatorios vencidos o próximos (≤7 días); si no hay nada que avisar, no
 * ocupa espacio. Se autoabastece del store (igual que otras pantallas
 * comparten el mismo store sin coordinarse entre sí).
 */
export function AvisoRecordatorios() {
  const recordatorios = useRecordatorios((estado) => estado.recordatorios)
  const cargar = useRecordatorios((estado) => estado.cargar)

  useEffect(() => {
    void cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { vencidos, proximos } = useMemo(() => {
    let vencidos = 0
    let proximos = 0
    for (const recordatorio of recordatorios) {
      const { diasHasta } = calcularProximaOcurrencia(recordatorio.fecha, recordatorio.recurrencia)
      const estado = calcularEstadoProximidad(diasHasta)
      if (estado === 'vencido') vencidos++
      else if (estado === 'proximo') proximos++
    }
    return { vencidos, proximos }
  }, [recordatorios])

  if (vencidos === 0 && proximos === 0) return null

  const mensaje =
    vencidos > 0
      ? `Tienes ${vencidos} recordatorio${vencidos === 1 ? '' : 's'} vencido${vencidos === 1 ? '' : 's'}`
      : `Tienes ${proximos} recordatorio${proximos === 1 ? '' : 's'} esta semana`

  return (
    <Link
      to="/otros/recordatorios"
      className={[
        'mb-5 flex items-center gap-2.5 rounded-card border px-3.5 py-2.5 text-sm font-medium transition-colors',
        vencidos > 0
          ? 'border-danger/30 bg-danger-soft text-danger'
          : 'border-accent/30 bg-accent-soft text-accent',
      ].join(' ')}
    >
      <IconoCampana className="size-4 shrink-0" />
      <span className="flex-1">{mensaje}</span>
      <span className="shrink-0 font-semibold">Ver →</span>
    </Link>
  )
}
