import type { ComponentType, SVGProps } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { IconoBolsillos, IconoMetas, IconoOtros } from '@/components/ui/iconos'

/**
 * Barra de navegación inferior: las 3 secciones principales de la app.
 *
 * En móvil ocupa todo el ancho, pegada abajo y respetando la barra de gestos.
 * En pantallas grandes flota como una píldora centrada, para que no se vea
 * estirada de lado a lado.
 */

interface Pestana {
  ruta: string
  etiqueta: string
  Icono: ComponentType<SVGProps<SVGSVGElement>>
  /** Otras rutas que deben dejar esta pestaña marcada como activa. */
  relacionadas?: string[]
}

const PESTANAS: Pestana[] = [
  { ruta: '/metas', etiqueta: 'Metas', Icono: IconoMetas },
  {
    ruta: '/bolsillos',
    etiqueta: 'Bolsillos',
    Icono: IconoBolsillos,
    // El presupuesto se entra desde Bolsillos, así que la pestaña sigue
    // marcada mientras el usuario está ahí y no se siente perdido.
    relacionadas: ['/presupuesto'],
  },
  { ruta: '/otros', etiqueta: 'Otros', Icono: IconoOtros },
]

export function BarraInferior() {
  const { pathname } = useLocation()

  function estaActiva(pestana: Pestana): boolean {
    const rutas = [pestana.ruta, ...(pestana.relacionadas ?? [])]
    return rutas.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`))
  }

  return (
    <nav
      aria-label="Navegación principal"
      className={[
        'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md',
        'pb-[env(safe-area-inset-bottom)]',
        // A partir de sm deja de estar pegada a los bordes y flota centrada.
        'sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2',
        'sm:rounded-pill sm:border sm:px-2 sm:pb-0 sm:shadow-flotante',
      ].join(' ')}
    >
      <ul className="mx-auto flex w-full max-w-md items-stretch justify-around sm:gap-1">
        {PESTANAS.map((pestana) => {
          const activa = estaActiva(pestana)
          const { Icono } = pestana

          return (
            <li key={pestana.ruta} className="flex-1 sm:flex-none">
              <Link
                to={pestana.ruta}
                aria-current={activa ? 'page' : undefined}
                className={[
                  'flex h-16 flex-col items-center justify-center gap-1 rounded-pill transition-colors',
                  'sm:h-12 sm:flex-row sm:gap-2 sm:px-5',
                  activa ? 'text-accent sm:bg-accent-soft' : 'text-muted hover:text-text',
                ].join(' ')}
              >
                <Icono className={activa ? 'size-6 sm:size-5' : 'size-6 sm:size-5'} />
                <span className="text-[11px] leading-none font-medium sm:text-sm">
                  {pestana.etiqueta}
                </span>
                {/* Marca del acento bajo la pestaña activa (solo en móvil). */}
                <span
                  aria-hidden
                  className={[
                    'h-0.5 w-6 rounded-pill transition-colors sm:hidden',
                    activa ? 'bg-accent-fill' : 'bg-transparent',
                  ].join(' ')}
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
