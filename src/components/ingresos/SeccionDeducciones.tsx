import { useState } from 'react'

import { CampoMoneda } from '@/components/ui/CampoMoneda'
import { redondearMil } from '@/lib/finanzas'
import { formatearCOP } from '@/lib/formato'
import type { CamposEditablesIngreso } from '@/stores/ingresos'
import type { Ingreso } from '@/types/basedatos'

/**
 * Deducciones automáticas de un ingreso: auxilio de transporte (se suma) y
 * salud/pensión (se restan, calculadas como % del bruto). Los porcentajes
 * vienen con 4%/4% por defecto pero se pueden ajustar por si el usuario tiene
 * un contrato distinto.
 */
interface Props {
  ingreso: Ingreso
  onCambiar: (cambios: CamposEditablesIngreso) => void
}

export function SeccionDeducciones({ ingreso, onCambiar }: Props) {
  const salud = redondearMil((ingreso.monto_bruto * ingreso.salud_pct) / 100)
  const pension = redondearMil((ingreso.monto_bruto * ingreso.pension_pct) / 100)

  return (
    <div className="flex flex-col gap-4">
      <CampoMoneda
        etiqueta="Auxilio de transporte"
        valor={ingreso.auxilio_transporte}
        onCambio={(valor) => onCambiar({ auxilio_transporte: valor })}
        ayuda="Se suma al neto."
      />

      <div className="flex flex-col gap-3 rounded-card bg-surface-2 p-3.5">
        <FilaPorcentaje
          etiqueta="Salud"
          porcentaje={ingreso.salud_pct}
          monto={salud}
          onCambiarPorcentaje={(pct) => onCambiar({ salud_pct: pct })}
        />
        <FilaPorcentaje
          etiqueta="Pensión"
          porcentaje={ingreso.pension_pct}
          monto={pension}
          onCambiarPorcentaje={(pct) => onCambiar({ pension_pct: pct })}
          conBorde
        />
      </div>
    </div>
  )
}

interface PropsFila {
  etiqueta: string
  porcentaje: number
  monto: number
  onCambiarPorcentaje: (pct: number) => void
  conBorde?: boolean
}

function FilaPorcentaje({ etiqueta, porcentaje, monto, onCambiarPorcentaje, conBorde }: PropsFila) {
  const [editando, setEditando] = useState(false)

  return (
    <div className={`flex items-center justify-between gap-3 ${conBorde ? 'border-t border-border pt-3' : ''}`}>
      <div>
        <p className="text-sm text-text">{etiqueta}</p>
        {editando ? (
          <div className="mt-1 flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={porcentaje}
              autoFocus
              onChange={(e) => onCambiarPorcentaje(Number(e.target.value))}
              onBlur={() => setEditando(false)}
              className="h-8 w-16 rounded-card border border-accent bg-surface px-2 text-sm text-text outline-none"
            />
            <span className="text-xs text-muted">%</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="mt-0.5 text-xs text-muted hover:text-accent hover:underline"
          >
            Auto {porcentaje}% · ajustar
          </button>
        )}
      </div>
      <span className="cifra text-sm font-semibold text-danger">− {formatearCOP(monto)}</span>
    </div>
  )
}
