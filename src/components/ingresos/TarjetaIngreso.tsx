import { useState } from 'react'

import { SeccionDeducciones } from '@/components/ingresos/SeccionDeducciones'
import { SeccionDescuentos } from '@/components/ingresos/SeccionDescuentos'
import { Acordeon } from '@/components/ui/Acordeon'
import { Boton } from '@/components/ui/Boton'
import { CampoMoneda } from '@/components/ui/CampoMoneda'
import { IconoBasura, IconoFlechaAbajo } from '@/components/ui/iconos'
import { IndicadorGuardado } from '@/components/ui/IndicadorGuardado'
import { SeccionExpandible } from '@/components/ui/SeccionExpandible'
import { Selector } from '@/components/ui/Selector'
import { BANCOS_COLOMBIA } from '@/lib/bancos'
import { netoIngreso, normalizarAMensual, redondearMil } from '@/lib/finanzas'
import { formatearCOP } from '@/lib/formato'
import { useIngresos } from '@/stores/ingresos'
import type { DeduccionPersonalizada, Ingreso } from '@/types/basedatos'

/**
 * Tarjeta de un ingreso: acordeón que, contraído, resume nombre + banco +
 * neto, y expandido muestra todo el detalle. Se autoguarda (ver
 * src/stores/ingresos.ts); no hay botón de guardar. Contraer es solo visual:
 * los cálculos y el autosave siguen funcionando igual con la tarjeta cerrada.
 */
interface Props {
  ingreso: Ingreso
  descuentos: DeduccionPersonalizada[]
}

const OPCIONES_MONEDA = [
  { valor: 'COP', etiqueta: 'COP — Peso colombiano' },
  { valor: 'USD', etiqueta: 'USD — Dólar' },
]

const OPCIONES_BANCO = BANCOS_COLOMBIA.map((banco) => ({ valor: banco, etiqueta: banco }))

export function TarjetaIngreso({ ingreso, descuentos }: Props) {
  const actualizarIngreso = useIngresos((estado) => estado.actualizarIngreso)
  const eliminarIngreso = useIngresos((estado) => estado.eliminarIngreso)
  const guardando = useIngresos((estado) => estado.guardando.has(ingreso.id))
  const abierta = useIngresos((estado) => estado.idsAbiertos.has(ingreso.id))
  const alternarAbierto = useIngresos((estado) => estado.alternarAbierto)

  const [seccionAbierta, setSeccionAbierta] = useState<'deducciones' | 'descuentos' | null>(null)
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)

  const montosDescuentos = descuentos.map((descuento) => descuento.monto)
  const totalDescuentosPersonalizados = montosDescuentos.reduce((suma, monto) => suma + monto, 0)
  const neto = netoIngreso(ingreso, montosDescuentos)
  const netoMensual = normalizarAMensual(neto, ingreso.frecuencia)
  const esQuincenal = ingreso.frecuencia === 'quincena'

  // Todo lo que se RESTA del bruto (para la fila resumen): salud + pensión +
  // descuentos personalizados. El auxilio de transporte no cuenta aquí porque
  // se SUMA, no se resta.
  const totalRestado =
    redondearMil((ingreso.monto_bruto * ingreso.salud_pct) / 100) +
    redondearMil((ingreso.monto_bruto * ingreso.pension_pct) / 100) +
    totalDescuentosPersonalizados

  function alternarSeccion(seccion: 'deducciones' | 'descuentos') {
    setSeccionAbierta((actual) => (actual === seccion ? null : seccion))
  }

  return (
    <article className="overflow-hidden rounded-panel border border-border bg-surface shadow-card">
      <Acordeon
        abierta={abierta}
        claseCuerpo="border-t border-border p-5 sm:p-7"
        encabezado={
          abierta ? (
            // ---- Encabezado EXPANDIDO: nombre editable + guardado + eliminar ----
            <div className="flex items-center gap-2 p-5 sm:p-7">
              <button
                type="button"
                onClick={() => alternarAbierto(ingreso.id)}
                aria-expanded={true}
                aria-label="Contraer este ingreso"
                className="grid size-8 shrink-0 place-items-center rounded-pill text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                <IconoFlechaAbajo className="size-4 rotate-180" />
              </button>

              <label htmlFor={`nombre-${ingreso.id}`} className="sr-only">
                Nombre del ingreso
              </label>
              <input
                id={`nombre-${ingreso.id}`}
                value={ingreso.nombre}
                onChange={(e) => actualizarIngreso(ingreso.id, { nombre: e.target.value })}
                placeholder="Nombre del ingreso, ej. Davivienda"
                className="min-w-0 flex-1 rounded-card bg-transparent px-1 font-display text-lg font-semibold text-text outline-none placeholder:text-muted focus:bg-surface-2"
              />

              <IndicadorGuardado guardando={guardando} />

              {confirmandoEliminar ? (
                <div className="flex shrink-0 items-center gap-1.5 text-xs">
                  <span className="hidden text-muted sm:inline">¿Eliminar?</span>
                  <button
                    type="button"
                    onClick={() => void eliminarIngreso(ingreso.id)}
                    className="rounded-pill bg-danger-fill px-2.5 py-1.5 font-semibold text-white"
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmandoEliminar(false)}
                    className="rounded-pill px-2.5 py-1.5 font-semibold text-muted hover:bg-surface-2"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmandoEliminar(true)}
                  aria-label={`Eliminar el ingreso ${ingreso.nombre}`}
                  className="grid size-9 shrink-0 place-items-center rounded-pill text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <IconoBasura className="size-4" />
                </button>
              )}
            </div>
          ) : (
            // ---- Encabezado CONTRAÍDO: nombre + banco + total, todo clicable ----
            <button
              type="button"
              onClick={() => alternarAbierto(ingreso.id)}
              aria-expanded={false}
              className="flex w-full items-center gap-3 p-5 text-left transition-colors hover:bg-surface-2 sm:p-7"
            >
              <IconoFlechaAbajo className="size-4 shrink-0 text-muted" />

              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-base font-semibold text-text sm:text-lg">
                  {ingreso.nombre || 'Ingreso sin nombre'}
                </span>
                {ingreso.banco && <span className="block truncate text-xs text-muted">{ingreso.banco}</span>}
              </span>

              <IndicadorGuardado guardando={guardando} />

              <span className="cifra shrink-0 text-base font-bold wrap-break-word text-positive sm:text-lg">
                {formatearCOP(neto)}
              </span>
            </button>
          )
        }
      >
        {/* Fila resumen: ingresos (bruto) | deducciones (restado) | total (neto).
            Tres columnas es poco espacio en un teléfono angosto: si un monto es
            muy largo, `wrap-break-word` lo deja pasar a una segunda línea en
            vez de cortarlo. Nunca usa truncate/ellipsis. */}
        <div className="grid grid-cols-3 gap-1.5 rounded-card bg-surface-2 p-3 text-center sm:gap-3 sm:p-4">
          <div>
            <p className="text-[11px] tracking-wide text-muted uppercase">Ingresos</p>
            <p className="cifra mt-1 text-xs leading-tight font-semibold wrap-break-word text-text sm:text-base">
              {formatearCOP(ingreso.monto_bruto)}
            </p>
          </div>
          <div>
            <p className="text-[11px] tracking-wide text-muted uppercase">Deducciones</p>
            <p className="cifra mt-1 text-xs leading-tight font-semibold wrap-break-word text-danger sm:text-base">
              − {formatearCOP(totalRestado)}
            </p>
          </div>
          <div>
            <p className="text-[11px] tracking-wide text-muted uppercase">Total</p>
            <p className="cifra mt-1 text-xs leading-tight font-semibold wrap-break-word text-positive sm:text-base">
              {formatearCOP(neto)}
            </p>
          </div>
        </div>

        {/* Monto bruto + moneda */}
        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto]">
          <CampoMoneda
            etiqueta={esQuincenal ? 'Monto bruto de la quincena' : 'Monto bruto mensual'}
            valor={ingreso.monto_bruto}
            onCambio={(valor) => actualizarIngreso(ingreso.id, { monto_bruto: valor })}
            ayuda={
              esQuincenal
                ? 'Este monto es el de UNA quincena, no el del mes completo.'
                : 'Antes de salud, pensión y otros descuentos.'
            }
          />

          <div className="sm:w-36">
            <Selector
              etiqueta="Moneda"
              opciones={OPCIONES_MONEDA}
              value={ingreso.moneda}
              onChange={(e) => actualizarIngreso(ingreso.id, { moneda: e.target.value })}
            />
          </div>
        </div>

        {/* Frecuencia de pago */}
        <div className="mt-5">
          <p className="mb-1.5 text-sm font-medium text-text">¿Cada cuánto te pagan?</p>
          <div
            role="group"
            aria-label="Frecuencia de pago"
            className="inline-flex rounded-pill border border-border bg-surface-2 p-1"
          >
            {(['mes', 'quincena'] as const).map((valor) => (
              <button
                key={valor}
                type="button"
                aria-pressed={ingreso.frecuencia === valor}
                onClick={() => actualizarIngreso(ingreso.id, { frecuencia: valor })}
                className={[
                  'rounded-pill px-4 py-2 text-sm font-semibold transition-colors',
                  ingreso.frecuencia === valor
                    ? 'bg-accent-fill text-on-accent'
                    : 'text-muted hover:text-text',
                ].join(' ')}
              >
                {valor === 'mes' ? 'Mensual' : 'Quincenal'}
              </button>
            ))}
          </div>
        </div>

        {/* Banco */}
        <div className="mt-5">
          <Selector
            etiqueta="¿En qué banco te pagan este ingreso?"
            opciones={OPCIONES_BANCO}
            placeholder="Selecciona un banco"
            value={ingreso.banco ?? ''}
            onChange={(e) => actualizarIngreso(ingreso.id, { banco: e.target.value || null })}
          />
        </div>

        {/* Cifra grande del neto */}
        <div className="mt-6 rounded-card bg-accent-soft p-4">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            Te queda neto {esQuincenal ? 'por quincena' : 'al mes'}
          </p>
          <p className="cifra mt-1 text-3xl font-bold wrap-break-word text-positive sm:text-4xl">
            {formatearCOP(neto)}
          </p>
          {esQuincenal && (
            <p className="mt-1 text-sm text-muted">≈ {formatearCOP(netoMensual)} al mes (dos quincenas)</p>
          )}
        </div>

        {/* Secciones expandibles */}
        <div className="mt-5 flex flex-col gap-3">
          <SeccionExpandible
            titulo="Deducciones"
            subtitulo="Auxilio de transporte, salud y pensión"
            abierta={seccionAbierta === 'deducciones'}
            onAlternar={() => alternarSeccion('deducciones')}
          >
            <SeccionDeducciones
              ingreso={ingreso}
              onCambiar={(cambios) => actualizarIngreso(ingreso.id, cambios)}
            />
          </SeccionExpandible>

          <SeccionExpandible
            titulo="Descuentos personalizados"
            subtitulo={
              descuentos.length > 0
                ? `${descuentos.length} descuento${descuentos.length === 1 ? '' : 's'} · − ${formatearCOP(totalDescuentosPersonalizados)}`
                : 'Libranzas, fondo de empleados, etc.'
            }
            abierta={seccionAbierta === 'descuentos'}
            onAlternar={() => alternarSeccion('descuentos')}
          >
            <SeccionDescuentos ingresoId={ingreso.id} descuentos={descuentos} />
          </SeccionExpandible>
        </div>

        {/* Prima anual */}
        <div className="mt-5">
          <CampoMoneda
            etiqueta="Prima (al año)"
            valor={ingreso.prima_anual}
            onCambio={(valor) => actualizarIngreso(ingreso.id, { prima_anual: valor })}
            ayuda={
              ingreso.prima_anual > 0
                ? `Es anual: no se suma al total mensual. Prorrateada equivale a ≈ ${formatearCOP(ingreso.prima_anual / 12)}/mes.`
                : 'Es anual: no se suma al total mensual, se muestra aparte.'
            }
          />
        </div>
      </Acordeon>
    </article>
  )
}

/** Tarjeta que se muestra cuando el usuario todavía no tiene ningún ingreso. */
export function TarjetaIngresoVacia({ onCrear }: { onCrear: () => void }) {
  return (
    <div className="rounded-panel border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
      <p className="text-sm font-medium text-text">Todavía no tienes ingresos registrados</p>
      <p className="mx-auto mt-2 max-w-xs text-xs text-muted">
        Agrega tu primer ingreso para empezar a calcular cuánto te entra neto cada mes.
      </p>
      <Boton className="mt-5" onClick={onCrear}>
        Agregar mi primer ingreso
      </Boton>
    </div>
  )
}
