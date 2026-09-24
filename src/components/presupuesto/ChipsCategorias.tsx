import type { CSSProperties } from 'react'

import { IconoRecibo } from '@/components/ui/iconos'
import { esColorClaro } from '@/lib/color'
import { formatearCOP } from '@/lib/formato'
import type { Categoria } from '@/types/basedatos'

/**
 * Fila de chips: primero un chip informativo de Ingresos (solo lectura, no
 * filtra nada — la misma cifra ya vive en la barra de resumen de arriba),
 * luego una por categoría, y al final "Todas". Se envuelven en varios
 * renglones (flex-wrap): cada chip toma el ancho que su contenido necesita y
 * salta de línea si no cabe, sin scroll horizontal ni desborde.
 */
interface Props {
  totalIngresos: number
  categorias: Categoria[]
  totalesPorCategoria: Record<string, number>
  /** null = "Todas" está activa. */
  categoriaActivaId: string | null
  onSeleccionar: (id: string | null) => void
}

export function ChipsCategorias({
  totalIngresos,
  categorias,
  totalesPorCategoria,
  categoriaActivaId,
  onSeleccionar,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="flex shrink-0 items-center gap-2 rounded-pill border border-border bg-surface px-3.5 py-2 whitespace-nowrap">
        <IconoRecibo className="size-4 shrink-0 text-muted" />
        <span className="text-sm font-semibold text-text">Ingresos</span>
        <span className="cifra text-xs font-semibold text-muted">{formatearCOP(totalIngresos)}</span>
      </span>

      {categorias.map((categoria) => (
        <Chip
          key={categoria.id}
          activo={categoriaActivaId === categoria.id}
          nombre={categoria.nombre}
          total={totalesPorCategoria[categoria.id] ?? 0}
          color={categoria.color}
          onClick={() => onSeleccionar(categoria.id)}
        />
      ))}

      <Chip
        activo={categoriaActivaId === null}
        nombre="Todas"
        onClick={() => onSeleccionar(null)}
        variante="texto"
      />
    </div>
  )
}

interface PropsChip {
  activo: boolean
  nombre: string
  total?: number
  /** Color propio de la categoría (dato de la fila, no un token de tema). */
  color?: string
  onClick: () => void
  /** "texto": sin pastilla cuando está inactivo (para "Todas"). */
  variante?: 'pastilla' | 'texto'
}

function Chip({ activo, nombre, total, color, onClick, variante = 'pastilla' }: PropsChip) {
  // El chip activo se resalta con el color DE LA CATEGORÍA (viene de la base
  // de datos, pensado para distinguirlas sin importar el tema); "Todas" no
  // tiene color propio y usa el acento normal de la app.
  let claseActivo = 'border-accent-fill bg-accent-fill text-on-accent'
  let estiloActivo: CSSProperties | undefined
  if (activo && color) {
    estiloActivo = { backgroundColor: color, borderColor: color }
    claseActivo = esColorClaro(color) ? 'text-black' : 'text-white'
  }

  const claseInactivo = variante === 'texto' ? 'border-transparent text-muted hover:text-text' : 'border-border bg-surface text-text hover:bg-surface-2'

  return (
    <button
      type="button"
      onClick={onClick}
      style={activo ? estiloActivo : undefined}
      className={[
        'flex shrink-0 items-center gap-2 rounded-pill border px-3.5 py-2 whitespace-nowrap transition-colors',
        activo ? claseActivo : claseInactivo,
      ].join(' ')}
    >
      {color && !activo && (
        <span aria-hidden className="size-2.5 shrink-0 rounded-pill" style={{ backgroundColor: color }} />
      )}
      <span className="text-sm font-semibold">{nombre}</span>
      {total !== undefined && <span className="cifra text-xs font-semibold opacity-90">{formatearCOP(total)}</span>}
    </button>
  )
}
