import { formatearCOP } from '@/lib/formato'

/**
 * Barra horizontal apilada de varios segmentos (p. ej. Gastos/Ahorro/
 * Excedente), con su leyenda debajo. El ancho de cada segmento es
 * `valor / total`, así que si la suma de los segmentos es menor que `total`
 * (por ejemplo, en déficit se omite el segmento de excedente) la barra
 * simplemente no se llena del todo, en vez de desbordarse.
 */
interface Segmento {
  etiqueta: string
  valor: number
  /** Clase de Tailwind para el color de relleno, p. ej. "bg-positive-fill". */
  claseColor: string
}

interface Props {
  segmentos: Segmento[]
  /** Denominador para calcular los anchos (normalmente los ingresos). */
  total: number
}

export function BarraApilada({ segmentos, total }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 w-full overflow-hidden rounded-pill bg-surface-2">
        {segmentos
          .filter((segmento) => segmento.valor > 0)
          .map((segmento) => (
            <div
              key={segmento.etiqueta}
              className={segmento.claseColor}
              style={{ width: `${Math.max(0, Math.min(100, (segmento.valor / total) * 100))}%` }}
            />
          ))}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {segmentos.map((segmento) => (
          <div key={segmento.etiqueta} className="flex items-center gap-2 text-sm">
            <span aria-hidden className={`size-2.5 shrink-0 rounded-pill ${segmento.claseColor}`} />
            <span className="text-muted">{segmento.etiqueta}</span>
            <span className="cifra font-semibold text-text">{formatearCOP(segmento.valor)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
