import { Acordeon } from '@/components/ui/Acordeon'
import { CampoMoneda } from '@/components/ui/CampoMoneda'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { IconoFlechaAbajo } from '@/components/ui/iconos'
import { IndicadorGuardado } from '@/components/ui/IndicadorGuardado'
import { formatearCOP } from '@/lib/formato'
import { evaluarDiferencia } from '@/lib/seguimiento'
import { useSeguimientoMensual } from '@/stores/seguimientoMensual'
import type { CategoriaSlug, SeguimientoMensual } from '@/types/basedatos'

import { ControlEstado } from './ControlEstado'
import { IndicadorDiferencia } from './IndicadorDiferencia'

/**
 * Tinte de fondo de la fila. Es un refuerzo para escanear el mes de un
 * vistazo: la fuente de verdad sigue siendo el ✓/✗ y el indicador de
 * diferencia, que no cambian.
 *
 * La columna se lee en tres niveles de gravedad: verde = lo pagué como lo
 * planeé, ámbar = lo pagué pero me pasé del monto, rojo = no lo pagué. El rojo
 * es para el ✗ porque dejar algo sin pagar pesa más que pagarlo de más.
 *
 * Pagar EXACTO cuenta como verde: en un presupuesto pegarle a tu número es el
 * caso de éxito. Si 'igual' fuera neutro, como el flujo normal es marcar ✓ sin
 * tocar el monto, casi ninguna fila se teñiría y no habría nada que escanear.
 *
 * El matiz fino de cuánto se pasó o se quedó corto no se pierde: lo lleva el
 * IndicadorDiferencia, que sigue siendo la fuente de verdad.
 *
 * El sentido lo da `evaluarDiferencia`, así que la inversión de "Ahorro con
 * propósito" (ahorrar de menos es desfavorable) se hereda sin lógica duplicada.
 */
function fondoSegunEstado(registro: SeguimientoMensual, categoriaSlug: CategoriaSlug): string {
  if (registro.cumplido === null) return 'bg-transparent'
  if (registro.cumplido === false) return 'bg-danger-tenue'
  // Cumplido sin monto capturado: cumplió, que es lo que importa para el barrido.
  if (registro.monto_pagado === null) return 'bg-positive-tenue'

  const { sentido } = evaluarDiferencia(registro.monto_pagado, registro.monto_presupuestado, categoriaSlug)
  return sentido === 'desfavorable' ? 'bg-warning-tenue' : 'bg-positive-tenue'
}

/**
 * Una línea de seguimiento: el concepto con su monto presupuestado y el
 * control de tres posiciones. Al marcarlo se despliega inline el detalle
 * opcional (cuánto se pagó y una nota) sobre el primitivo `Acordeon`.
 *
 * El detalle va inline y no en un mini-modal porque marcar varios conceptos
 * seguidos es el gesto normal de esta pantalla, y un modal por fila obligaría
 * a abrir y cerrar una y otra vez.
 *
 * Quién está desplegado lo decide el padre (`ListaSeguimiento`), que mantiene
 * un solo abierto a la vez. Colapsada, la fila sigue mostrando todo lo que
 * importa: el estado, el monto y la diferencia si la hay.
 */
interface Props {
  registro: SeguimientoMensual
  /** Nombre del concepto al que apunta el registro. */
  nombreConcepto: string
  categoriaSlug: CategoriaSlug
  abierta: boolean
  /** Pide al padre abrir esta fila (y cerrar la que estuviera) o cerrarla. */
  onAbertura: (abierta: boolean) => void
  /** Los meses futuros se ven pero no se marcan. */
  soloLectura?: boolean
}

export function FilaSeguimiento({
  registro,
  nombreConcepto,
  categoriaSlug,
  abierta,
  onAbertura,
  soloLectura = false,
}: Props) {
  const actualizar = useSeguimientoMensual((estado) => estado.actualizar)
  const guardando = useSeguimientoMensual((estado) => estado.guardando.has(registro.id))

  const marcado = registro.cumplido !== null
  const desplegable = marcado && !soloLectura

  function cambiarEstado(cumplido: boolean | null) {
    // Tocar otra vez el estado que ya estaba marcado solo pliega o despliega.
    // No se vuelve a guardar nada ni se pierde lo capturado.
    if (cumplido === registro.cumplido) {
      onAbertura(!abierta)
      return
    }

    // Cambiar de estado DESCARTA el contexto del anterior: el monto y la nota
    // que escribiste bajo un ✓ no significan nada bajo un ✗, y dejarlos haría
    // que el indicador de diferencia de la marca vieja siguiera visible sobre
    // la nueva. Al dar por cumplido se precarga el presupuestado, que es lo
    // más común; en los otros dos estados el monto queda en blanco.
    actualizar(registro.id, {
      cumplido,
      monto_pagado: cumplido === true ? registro.monto_presupuestado : null,
      nota: null,
    })

    onAbertura(cumplido !== null)
  }

  return (
    <div
      // El tinte vive en el contenedor, que envuelve encabezado y cuerpo del
      // acordeón: así la señal se ve igual con la fila colapsada y expandida.
      className={['rounded-card p-3 transition-colors', fondoSegunEstado(registro, categoriaSlug)].join(' ')}
    >
      <Acordeon
        abierta={abierta && desplegable}
        claseCuerpo="mt-3 flex flex-col gap-3 border-t border-border pt-3"
        encabezado={
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-medium ${marcado ? 'text-text' : 'text-muted'}`}>
                {nombreConcepto}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="cifra text-sm font-semibold text-text">
                  {formatearCOP(registro.monto_presupuestado)}
                </span>
                {/* Visible también con la fila colapsada: al plegar no se
                    pierde de vista que se pagó de más o de menos. */}
                {registro.monto_pagado !== null && (
                  <IndicadorDiferencia
                    montoPagado={registro.monto_pagado}
                    montoPresupuestado={registro.monto_presupuestado}
                    categoriaSlug={categoriaSlug}
                  />
                )}
              </div>
            </div>

            <IndicadorGuardado guardando={guardando} />

            <ControlEstado
              valor={registro.cumplido}
              onCambiar={cambiarEstado}
              concepto={nombreConcepto}
              disabled={soloLectura}
            />

            {desplegable && (
              <button
                type="button"
                onClick={() => onAbertura(!abierta)}
                aria-expanded={abierta}
                aria-label={`${abierta ? 'Cerrar' : 'Abrir'} detalle de ${nombreConcepto}`}
                className="grid size-9 shrink-0 place-items-center rounded-pill text-muted transition-colors hover:bg-surface hover:text-text"
              >
                <IconoFlechaAbajo className={`size-4 transition-transform ${abierta ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        }
      >
        {/* Solo se monta cuando hay algo que editar: una fila pendiente no
            deja campos ocultos en el DOM. */}
        {desplegable && (
          <>
            <CampoMoneda
              etiqueta="¿Cuánto pagaste?"
              valor={registro.monto_pagado ?? 0}
              onCambio={(valor) => actualizar(registro.id, { monto_pagado: valor })}
            />

            <CampoTexto
              etiqueta={registro.cumplido ? 'Nota (opcional)' : '¿Por qué no se pagó? (opcional)'}
              value={registro.nota ?? ''}
              onChange={(e) => actualizar(registro.id, { nota: e.target.value || null })}
            />
          </>
        )}
      </Acordeon>
    </div>
  )
}
