import { formatearCOP } from '@/lib/formato'
import { evaluarDiferencia } from '@/lib/seguimiento'
import type { CategoriaSlug } from '@/types/basedatos'

/**
 * Compara lo pagado contra lo presupuestado. El texto es neutro y el color
 * hace el juicio, porque el mismo hecho se lee al revés según la categoría:
 * gastar de menos es bueno, pero ahorrar de menos no.
 *
 * Si se pagó exactamente lo presupuestado no pinta nada: la fila lo muestra
 * incluso colapsada, y un chip de "todo en orden" en cada concepto sería puro
 * ruido en una lista larga.
 */
interface Props {
  montoPagado: number
  montoPresupuestado: number
  categoriaSlug: CategoriaSlug
}

const COLOR_POR_SENTIDO = {
  favorable: 'bg-positive-soft text-positive',
  desfavorable: 'bg-danger-soft text-danger',
} as const

export function IndicadorDiferencia({ montoPagado, montoPresupuestado, categoriaSlug }: Props) {
  const { monto, sentido } = evaluarDiferencia(montoPagado, montoPresupuestado, categoriaSlug)

  if (sentido === 'igual') return null

  return (
    <span className={`cifra rounded-pill px-2.5 py-1 text-xs font-semibold ${COLOR_POR_SENTIDO[sentido]}`}>
      {formatearCOP(Math.abs(monto))} {monto > 0 ? 'por encima' : 'por debajo'} de lo presupuestado
    </span>
  )
}
