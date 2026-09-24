import { IconoCheck, IconoTendenciaBaja, IconoTendenciaSube } from '@/components/ui/iconos'
import { calcularEstadoPresupuesto } from '@/lib/diagnostico'
import { formatearCOP } from '@/lib/formato'

/**
 * Banner de estado: superávit / equilibrio / déficit, con el excedente
 * proyectado al mes y al año a la derecha.
 */
interface Props {
  excedente: number
  ahorro: number
}

const TITULOS: Record<ReturnType<typeof calcularEstadoPresupuesto>['tipo'], string> = {
  superavit: 'Vas en superávit',
  equilibrio: 'Vas en equilibrio',
  deficit: 'Vas en déficit',
}

const SUBTITULOS: Record<ReturnType<typeof calcularEstadoPresupuesto>['tipo'], string> = {
  superavit: 'Cada mes te sobra (después de ahorrar). Esto acumulas al año:',
  equilibrio: 'Cada mes te alcanza justo (después de ahorrar). Esto acumulas al año:',
  deficit: 'Cada mes te falta (después de ahorrar). Esto acumulas al año:',
}

export function BannerEstado({ excedente, ahorro }: Props) {
  const { tipo } = calcularEstadoPresupuesto(excedente, ahorro)
  const esPositivo = tipo !== 'deficit'

  const claseTono = esPositivo ? 'bg-positive-soft text-positive' : 'bg-danger-soft text-danger'
  const claseIcono = esPositivo ? 'bg-positive-fill' : 'bg-danger-fill'
  const Icono = esPositivo ? IconoTendenciaSube : IconoTendenciaBaja

  return (
    <div className={`flex flex-wrap items-start justify-between gap-4 rounded-card p-4 ${claseTono}`}>
      <div className="flex items-start gap-3">
        {/* Cuadro sólido con el icono en blanco: positive-fill y danger-fill
            son ambos lo bastante oscuros para que el blanco contraste bien
            en los dos temas (verificado con la misma fórmula de luminancia
            que usan los chips de categoría). */}
        <span aria-hidden className={`grid size-11 shrink-0 place-items-center rounded-xl ${claseIcono}`}>
          <Icono className="size-5 text-white" />
        </span>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-base font-bold">{TITULOS[tipo]}</p>
            {ahorro > 0 && (
              <span className="inline-flex items-center gap-1 rounded-pill border border-current/30 px-2.5 py-0.5 text-xs font-semibold">
                <IconoCheck className="size-3" />
                con ahorro
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm opacity-90">{SUBTITULOS[tipo]}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="text-right">
          <p className="text-xs tracking-wide uppercase opacity-70">Al mes</p>
          <p className="cifra text-lg font-bold wrap-break-word">{formatearCOP(excedente)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs tracking-wide uppercase opacity-70">Al año</p>
          <p className="cifra text-lg font-bold wrap-break-word">{formatearCOP(excedente * 12)}</p>
        </div>
      </div>
    </div>
  )
}
