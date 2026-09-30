import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { PorcentajeCumplimiento } from '@/components/presupuesto/seguimiento/PorcentajeCumplimiento'
import { IconoLlama } from '@/components/ui/iconos'
import { agruparCumplimientoPorMes, calcularRacha, clavePeriodo, periodoActual } from '@/lib/seguimiento'
import { useSeguimientoMensual } from '@/stores/seguimientoMensual'

/**
 * La racha de meses cumplidos y cómo va el mes en curso, dentro de la
 * progresión de Metas. Es SOLO LECTURA: se autoabastece del store de
 * seguimiento (igual que AvisoRecordatorios) y nunca dispara la RPC que crea
 * filas, así que abrir Inicio no siembra datos de ningún mes.
 *
 * No se muestra nada que se lea como fracaso. Si todavía no hay una racha, la
 * línea de racha no existe; si no hay nada marcado este mes, tampoco la del
 * mes; y si no hay ninguna de las dos, el componente no se pinta. Nunca
 * aparece un "0 meses" ni un 0% en gris.
 */
export function TarjetaRacha() {
  const historial = useSeguimientoMensual((estado) => estado.historial)
  const cargando = useSeguimientoMensual((estado) => estado.cargandoHistorial)
  const cargarHistorial = useSeguimientoMensual((estado) => estado.cargarHistorial)

  useEffect(() => {
    void cargarHistorial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { racha, mesActual } = useMemo(() => {
    const porMes = agruparCumplimientoPorMes(historial)
    const actual = periodoActual()
    return {
      racha: calcularRacha(porMes),
      mesActual: porMes.get(clavePeriodo(actual.anio, actual.mes)),
    }
  }, [historial])

  // El mes en curso solo se muestra cuando ya hay algo marcado: un 0% el día 1
  // no dice nada útil y se lee peor de lo que es.
  const marcadosEsteMes = mesActual ? mesActual.cumplidos + mesActual.noCumplidos : 0
  const mostrarMes = Boolean(mesActual && marcadosEsteMes > 0)
  const mostrarRacha = racha > 0

  if (cargando || (!mostrarRacha && !mostrarMes)) return null

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      {mostrarRacha && (
        <div className="flex items-center gap-2.5">
          <IconoLlama className="size-5 shrink-0 text-accent" />
          <p className="text-sm font-semibold text-text">
            {racha === 1
              ? 'Llevas un mes cumpliendo tu presupuesto'
              : `Llevas ${racha} meses cumpliendo tu presupuesto`}
          </p>
        </div>
      )}

      {mostrarMes && mesActual && (
        <div
          className={[
            'flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm',
            mostrarRacha ? 'border-t border-border pt-3' : '',
          ].join(' ')}
        >
          <span className="text-muted">Este mes vas en</span>
          <PorcentajeCumplimiento fraccion={mesActual.fraccion} className="text-base font-bold" />
          <span className="text-muted">
            ({marcadosEsteMes} de {mesActual.total} marcados)
          </span>
          <Link
            to="/presupuesto/mes-a-mes"
            className="ml-auto shrink-0 font-semibold text-accent hover:underline"
          >
            Ver detalle →
          </Link>
        </div>
      )}
    </div>
  )
}
