import { useState } from 'react'

import { Acordeon } from '@/components/ui/Acordeon'
import { Boton } from '@/components/ui/Boton'
import { IconoCandado, IconoFlechaAbajo, IconoMas } from '@/components/ui/iconos'
import type { Meta } from '@/types/basedatos'

import { BannerBloqueado } from './BannerBloqueado'
import { ModalNuevaMeta } from './ModalNuevaMeta'
import { TarjetaMetaPropia } from './TarjetaMetaPropia'

/**
 * Etapa 3, como fila de acordeón. Bloqueada muestra el candado y el motivo
 * (el nivel más alto que falta) directo en el encabezado, sin necesidad de
 * abrirla. Las metas ya creadas se conservan y se siguen viendo aunque esté
 * bloqueada — solo se deshabilita crear/editar.
 */
interface Props {
  metas: Meta[]
  desbloqueada: boolean
  /** Versión corta para el encabezado contraído (poco espacio junto al título). */
  mensajeBloqueoCorto: string
  /** Versión completa para el contenido expandido. */
  mensajeBloqueo: string
  abierta: boolean
  onAlternar: () => void
}

export function FilaMetas({ metas, desbloqueada, mensajeBloqueoCorto, mensajeBloqueo, abierta, onAlternar }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false)

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
              desbloqueada ? 'bg-positive-soft text-positive' : 'bg-surface-2 text-muted'
            }`}
          >
            <IconoCandado className="size-4" />
          </span>
          <span
            className={`min-w-0 flex-1 truncate font-display text-base font-semibold ${
              desbloqueada ? 'text-text' : 'text-muted'
            }`}
          >
            Metas
          </span>
          {!desbloqueada && (
            <span className="max-w-[45%] shrink truncate text-right text-xs text-muted">{mensajeBloqueoCorto}</span>
          )}
          <IconoFlechaAbajo
            className={`size-4 shrink-0 text-muted transition-transform ${abierta ? 'rotate-180' : ''}`}
          />
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        {!desbloqueada && <BannerBloqueado mensaje={mensajeBloqueo} />}

        {desbloqueada && (
          <div className="flex justify-end">
            <Boton tamano="sm" variante="secundario" onClick={() => setModalAbierto(true)}>
              <IconoMas className="size-4" />
              Nueva meta
            </Boton>
          </div>
        )}

        {metas.length === 0 && desbloqueada && (
          <p className="text-sm text-muted">Todavía no has creado ninguna meta. ¡Anímate a crear la primera!</p>
        )}

        {/* Las metas ya creadas se siguen viendo aunque esté bloqueada: el
            dato no se pierde, solo se deshabilita su edición (ver `editable`). */}
        {metas.length > 0 && (
          <div className="flex flex-col gap-3">
            {metas.map((meta) => (
              <TarjetaMetaPropia key={meta.id} meta={meta} editable={desbloqueada} />
            ))}
          </div>
        )}
      </div>
    </Acordeon>
    <ModalNuevaMeta abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} />
    </div>
  )
}
