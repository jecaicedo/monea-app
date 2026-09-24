import { formatearCOP } from '@/lib/formato'
import { calcularTotalIngresosNetos } from '@/stores/ingresos'
import type { DeduccionPersonalizada, Ingreso } from '@/types/basedatos'

/**
 * Cuatro cifras del presupuesto: Ingresos, Gastos, Ahorro y Te sobra.
 *
 * Las cuatro se calculan en vivo EN EL CLIENTE (con los mismos datos que
 * editan las tarjetas de abajo), para que reaccionen al instante mientras se
 * escribe, sin esperar el debounce del autosave ni un round-trip a Supabase:
 *   INGRESOS  = calcularTotalIngresosNetos() (src/stores/ingresos.ts)
 *   GASTOS    = calcularTotalGastos() (src/stores/presupuesto.ts)
 *   AHORRO    = calcularTotalAhorro() (src/stores/presupuesto.ts)
 * Este componente no sabe nada de bolsillos ni conceptos: recibe los totales
 * ya calculados, calculados por quien lo usa (Actualiza.tsx).
 */
interface Props {
  ingresos: Ingreso[]
  deducciones: Record<string, DeduccionPersonalizada[]>
  totalGastos: number
  totalAhorro: number
}

export function BarraResumenIngresos({ ingresos, deducciones, totalGastos, totalAhorro }: Props) {
  const totalIngresos = calcularTotalIngresosNetos(ingresos, deducciones)
  const teSobra = totalIngresos - totalGastos - totalAhorro

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      <TarjetaCifra etiqueta="Ingresos" valor={totalIngresos} />
      <TarjetaCifra etiqueta="Gastos" valor={totalGastos} />
      <TarjetaCifra etiqueta="Ahorro" valor={totalAhorro} />
      <TarjetaCifra etiqueta="Te sobra" valor={teSobra} tono={teSobra >= 0 ? 'positive' : 'danger'} />
    </div>
  )
}

interface PropsTarjetaCifra {
  etiqueta: string
  valor: number
  tono?: 'positive' | 'danger'
  nota?: string
}

function TarjetaCifra({ etiqueta, valor, tono, nota }: PropsTarjetaCifra) {
  const colorTexto = tono === 'positive' ? 'text-positive' : tono === 'danger' ? 'text-danger' : 'text-text'

  return (
    <div className="rounded-card border border-border bg-surface p-3 sm:p-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{etiqueta}</p>
      {/* Nunca se corta: el tamaño baja un poco en el grid 2x2 de celular
          (donde el espacio es más ajustado) y sube desde `sm:`, cuando ya hay
          4 columnas con espacio de sobra. `wrap-break-word` es la red de
          seguridad final — si un monto fuera tan largo que ni así cupiera en
          una línea, pasa a una segunda línea en vez de cortarse. Verificado
          con montos de 8 y 9 cifras en varios anchos de pantalla. */}
      <p className={`cifra mt-1 text-sm leading-tight font-bold wrap-break-word sm:text-xl ${colorTexto}`}>
        {formatearCOP(valor)}
      </p>
      {nota && <p className="mt-1.5 text-[11px] text-muted">{nota}</p>}
    </div>
  )
}
