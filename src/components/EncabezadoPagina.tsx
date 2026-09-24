import type { ComponentType, ReactNode, SVGProps } from 'react'

/**
 * Encabezado estándar de cada página: título y, opcionalmente, una línea de
 * descripción y acciones a la derecha.
 */
interface Props {
  titulo: string
  descripcion?: string
  acciones?: ReactNode
}

export function EncabezadoPagina({ titulo, descripcion, acciones }: Props) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
          {titulo}
        </h1>
        {descripcion && <p className="mt-1 text-sm text-muted">{descripcion}</p>}
      </div>
      {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
    </div>
  )
}

/**
 * Bloque provisional para las secciones que todavía no tienen contenido.
 * Se irá borrando a medida que cada pantalla se construya de verdad.
 */
export function EnConstruccion({ nota }: { nota?: string }) {
  return (
    <div className="rounded-panel border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
      <p className="text-sm font-medium text-muted">Sección en construcción</p>
      {nota && <p className="mx-auto mt-2 max-w-xs text-xs text-muted">{nota}</p>}
    </div>
  )
}

/**
 * Estado "Próximamente" para una función ya planeada pero que todavía no se
 * construye: a diferencia de `EnConstruccion` (un cascarón temporal genérico),
 * este lleva ícono y copy propios por pantalla. Sin candados ni menciones a
 * planes de pago — la app no tiene funciones bloqueadas por eso.
 */
interface PropsProximamente {
  icono: ComponentType<SVGProps<SVGSVGElement>>
  titulo: string
  descripcion: string
}

export function Proximamente({ icono: Icono, titulo, descripcion }: PropsProximamente) {
  return (
    <div className="grid place-items-center px-6 py-16 text-center">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <span aria-hidden className="grid size-14 place-items-center rounded-full bg-accent-soft text-accent">
          <Icono className="size-7" />
        </span>
        <div>
          <p className="font-display text-lg font-bold text-text">{titulo}</p>
          <p className="mt-2 text-sm text-muted">{descripcion}</p>
        </div>
      </div>
    </div>
  )
}
