import { formatearPorcentaje } from '@/lib/formato'
import { nivelCumplimiento } from '@/lib/seguimiento'

/**
 * El % de cumplimiento pintado según su umbral. Existe como componente propio
 * para que el resumen de "Mes a mes" y la racha de Metas no puedan discrepar:
 * el mapa de colores y el formato viven aquí una sola vez.
 */
interface Props {
  fraccion: number
  /** Tamaño y peso los pone quien lo usa; el color sale del umbral. */
  className?: string
}

const COLOR_POR_NIVEL = {
  alto: 'text-positive',
  medio: 'text-text',
  bajo: 'text-danger',
} as const

export function PorcentajeCumplimiento({ fraccion, className = '' }: Props) {
  return (
    <span className={`cifra ${COLOR_POR_NIVEL[nivelCumplimiento(fraccion)]} ${className}`}>
      {formatearPorcentaje(fraccion)}
    </span>
  )
}
