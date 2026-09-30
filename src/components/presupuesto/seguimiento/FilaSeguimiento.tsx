import { Acordeon } from '@/components/ui/Acordeon'
import { CampoMoneda } from '@/components/ui/CampoMoneda'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { IconoFlechaAbajo } from '@/components/ui/iconos'
import { IndicadorGuardado } from '@/components/ui/IndicadorGuardado'
import { formatearCOP } from '@/lib/formato'
import { useSeguimientoMensual } from '@/stores/seguimientoMensual'
import type { CategoriaSlug, SeguimientoMensual } from '@/types/basedatos'

import { ControlEstado } from './ControlEstado'
import { IndicadorDiferencia } from './IndicadorDiferencia'

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
    // Volver a "pendiente" limpia lo capturado y cierra: el registro queda sin
    // marcar, así que no hay detalle que mostrar.
    if (cumplido === null) {
      actualizar(registro.id, { cumplido: null, monto_pagado: null, nota: null })
      onAbertura(false)
      return
    }

    // Tocar otra vez el estado que ya estaba marcado solo pliega o despliega.
    // No se vuelve a guardar nada ni se pierde la marca.
    if (cumplido === registro.cumplido) {
      onAbertura(!abierta)
      return
    }

    // Al dar por cumplido, lo más común es que se haya pagado justo lo
    // presupuestado: se precarga para que no haya que escribirlo. Si no se
    // cumplió, el monto queda en blanco (no se pagó nada, salvo que el usuario
    // diga otra cosa).
    if (cumplido === true && registro.monto_pagado === null) {
      actualizar(registro.id, { cumplido, monto_pagado: registro.monto_presupuestado })
    } else {
      actualizar(registro.id, { cumplido })
    }
    onAbertura(true)
  }

  return (
    <div
      className={[
        'rounded-card p-3 transition-colors',
        marcado ? 'bg-surface-2' : 'bg-transparent',
      ].join(' ')}
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
