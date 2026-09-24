import { useState } from 'react'
import { Link } from 'react-router-dom'

import { BarraProgreso } from '@/components/presupuesto/diagnostico/BarraProgreso'
import { Acordeon } from '@/components/ui/Acordeon'
import { Boton } from '@/components/ui/Boton'
import { CampoMoneda } from '@/components/ui/CampoMoneda'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { IconoCandado, IconoEscudo, IconoFlechaAbajo, IconoLapiz } from '@/components/ui/iconos'
import { IndicadorGuardado } from '@/components/ui/IndicadorGuardado'
import { formatearCOP, formatearPorcentaje } from '@/lib/formato'
import { calcularFondoLogrado } from '@/lib/metas'
import { useMetas } from '@/stores/metas'
import type { Meta } from '@/types/basedatos'

import { BannerBloqueado } from './BannerBloqueado'

/**
 * Etapa 2, como fila de acordeón. El objetivo y el ahorrado se muestran
 * compactos ("$X de $Y") con un lápiz que abre la edición — solo mientras el
 * presupuesto está en positivo; si cae en déficit, el monto se conserva
 * intacto pero la fila se ve bloqueada.
 */
interface Props {
  meta: Meta
  enPositivo: boolean
  abierta: boolean
  onAlternar: () => void
  /** Gastos mensuales actuales, para la sugerencia "mínimo recomendado ≈ 2 meses". */
  gastosMensuales: number
}

export function FilaFondoEmergencia({ meta, enPositivo, abierta, onAlternar, gastosMensuales }: Props) {
  const actualizarMeta = useMetas((estado) => estado.actualizarMeta)
  const guardando = useMetas((estado) => estado.guardando.has(meta.id))
  const [editando, setEditando] = useState(false)
  const [bolsilloCreado, setBolsilloCreado] = useState(false)

  const logrado = calcularFondoLogrado(meta, enPositivo)
  const fraccion = meta.monto_objetivo > 0 ? meta.monto_actual / meta.monto_objetivo : 0
  const minimoRecomendado = gastosMensuales * 2

  return (
    // Ver la nota en FilaPasarPositivo.tsx sobre por qué envolvemos el
    // Acordeon en un div: cuenta como UN solo hijo del `divide-y` exterior.
    <div>
    <Acordeon
      abierta={abierta}
      claseCuerpo="border-t border-border p-4 sm:p-5"
      encabezado={
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={abierta}
          className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-2 sm:p-5"
        >
          <span
            aria-hidden
            className={`grid size-9 shrink-0 place-items-center rounded-full ${
              enPositivo ? 'bg-positive-soft text-positive' : 'bg-surface-2 text-muted'
            }`}
          >
            {enPositivo ? <IconoEscudo className="size-4" /> : <IconoCandado className="size-4" />}
          </span>
          <span
            className={`min-w-0 flex-1 truncate font-display text-base font-semibold ${
              enPositivo ? 'text-text' : 'text-muted'
            }`}
          >
            Fondo de emergencia
          </span>
          <IndicadorGuardado guardando={guardando} />
          <span className={`shrink-0 text-sm font-semibold ${enPositivo ? 'text-positive' : 'text-muted'}`}>
            {enPositivo ? formatearPorcentaje(fraccion) : 'Bloqueado'}
          </span>
          <IconoFlechaAbajo
            className={`size-4 shrink-0 text-muted transition-transform ${abierta ? 'rotate-180' : ''}`}
          />
        </button>
      }
    >
      {!enPositivo ? (
        <BannerBloqueado mensaje="Primero necesitas pasar en positivo este mes">
          <Link to="/presupuesto/revisa" className="text-sm font-semibold text-accent hover:underline">
            Ajustar presupuesto en Revisa →
          </Link>
        </BannerBloqueado>
      ) : (
        <div className="flex flex-col gap-4">
          {logrado && (
            <p className="rounded-card bg-positive-soft p-3 text-sm font-medium text-positive">
              ¡Fondo completo! Ya tienes un respaldo listo para los imprevistos.
            </p>
          )}

          {editando ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <CampoMoneda
                etiqueta="Monto objetivo"
                valor={meta.monto_objetivo}
                onCambio={(valor) => actualizarMeta(meta.id, { monto_objetivo: valor })}
                ayuda="Mínimo recomendado ≈ 2 meses de gastos"
              />
              <CampoMoneda
                etiqueta="Cuánto llevas ahorrado"
                valor={meta.monto_actual}
                onCambio={(valor) => actualizarMeta(meta.id, { monto_actual: valor })}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="cifra text-lg font-bold wrap-break-word text-text">
                {formatearCOP(meta.monto_actual)} de {formatearCOP(meta.monto_objetivo)}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <BarraProgreso fraccion={fraccion} color="var(--color-positive-fill)" />
            </div>
            <span className="shrink-0 text-sm font-semibold text-positive">{formatearPorcentaje(fraccion)}</span>
            <button
              type="button"
              onClick={() => setEditando((valor) => !valor)}
              aria-label={editando ? 'Terminar de editar el fondo' : 'Editar el fondo de emergencia'}
              className="grid size-8 shrink-0 place-items-center rounded-pill text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              <IconoLapiz className="size-4" />
            </button>
          </div>

          <p className="rounded-card bg-surface-2 p-3 text-xs text-muted">
            Vas en <span className="font-semibold text-text">{formatearPorcentaje(fraccion)}</span> de tu fondo de
            emergencia. Recuerda: este dinero debería estar en un banco que te{' '}
            <span className="font-semibold text-text">genere intereses</span> pero que sea de{' '}
            <span className="font-semibold text-text">fácil acceso</span>, para que puedas usarlo en cualquier
            momento.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
            <div className="flex-1">
              <CampoTexto
                etiqueta="¿En qué banco tienes el bolsillo con el dinero de tu fondo de emergencia?"
                placeholder="¿En qué banco? (Nu, Trii, Efectivo...)"
                value={meta.banco ?? ''}
                onChange={(e) => actualizarMeta(meta.id, { banco: e.target.value || null })}
              />
            </div>
            <Boton
              tamano="md"
              variante="secundario"
              disabled={!meta.banco || bolsilloCreado}
              onClick={() => {
                // El nombre del banco ya se guarda con el autosave del campo
                // de arriba; este botón solo confirma la intención. La
                // conexión real con un bolsillo de "Bolsillos" llega en la
                // Etapa 6 — queda preparado el punto de enganche.
                setBolsilloCreado(true)
              }}
            >
              {bolsilloCreado ? 'Bolsillo listo' : 'Crear bolsillo'}
            </Boton>
          </div>

          {meta.monto_actual === 0 && (
            <p className="text-xs text-muted">
              Aún no tienes fondo de emergencia. Mínimo recomendado: ~2 meses de gastos (
              {formatearCOP(minimoRecomendado)}).
            </p>
          )}
        </div>
      )}
    </Acordeon>
    </div>
  )
}
