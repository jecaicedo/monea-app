import { formatearPorcentaje } from '@/lib/formato'

import { BarraApilada } from './BarraApilada'

/**
 * "Cómo usas tus ingresos": qué porcentaje se va en gastos vs. qué porcentaje
 * queda como capacidad de ahorro (ahorro + excedente), y la barra apilada
 * Gastos/Ahorro/Excedente que lo representa visualmente.
 */
interface Props {
  ingresos: number
  gastos: number
  ahorro: number
  excedente: number
}

export function ComoUsasIngresos({ ingresos, gastos, ahorro, excedente }: Props) {
  const fraccionUso = gastos / ingresos
  const fraccionCapacidad = (ahorro + excedente) / ingresos

  // Si hay déficit, el excedente es negativo: no tiene sentido pintarlo como
  // un segmento de la barra. El denominador crece para que Gastos+Ahorro
  // nunca desborden el 100% del ancho.
  const excedenteParaBarra = Math.max(excedente, 0)
  const denominadorBarra = Math.max(ingresos, gastos + ahorro)

  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
      <h3 className="font-display text-sm font-semibold tracking-wide text-muted uppercase">
        Cómo usas tus ingresos
      </h3>

      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-xs text-muted uppercase">Usas</p>
          <p className="font-display text-2xl font-bold text-text">{formatearPorcentaje(fraccionUso, 1)}</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase">Capacidad de ahorro</p>
          <p className="font-display text-2xl font-bold text-positive">{formatearPorcentaje(fraccionCapacidad, 1)}</p>
        </div>
      </div>

      <BarraApilada
        total={denominadorBarra}
        segmentos={[
          { etiqueta: 'Gastos', valor: gastos, claseColor: 'bg-muted' },
          { etiqueta: 'Ahorro', valor: ahorro, claseColor: 'bg-positive-fill' },
          { etiqueta: 'Excedente', valor: excedenteParaBarra, claseColor: 'bg-accent-fill' },
        ]}
      />
    </div>
  )
}
