import { NavLink, Outlet } from 'react-router-dom'

import { EncabezadoPagina } from '@/components/EncabezadoPagina'

/**
 * Vista de Presupuesto. Es un contenedor: el encabezado y las cuatro
 * sub-pestañas son fijos, y debajo se monta la sub-ruta activa.
 */

const SUBPESTANAS = [
  { ruta: 'actualiza', etiqueta: 'Actualiza' },
  { ruta: 'revisa', etiqueta: 'Revisa' },
  { ruta: 'distribuir', etiqueta: 'Distribuir' },
  { ruta: 'mes-a-mes', etiqueta: 'Mes a mes' },
]

export default function LayoutPresupuesto() {
  return (
    <>
      <EncabezadoPagina
        titulo="Presupuesto"
        descripcion="Actualiza tus montos, revisa cómo va el mes y marca qué se cumplió."
      />

      {/* Control segmentado de las cuatro sub-pestañas. Con cuatro ya no caben
          repartidas a lo ancho en un celular angosto, así que la tira se
          desplaza en horizontal en vez de apretar las etiquetas. */}
      <div
        role="tablist"
        aria-label="Secciones del presupuesto"
        className="mb-6 flex gap-1 overflow-x-auto rounded-pill border border-border bg-surface-2 p-1 scrollbar-none"
      >
        {SUBPESTANAS.map((sub) => (
          <NavLink
            key={sub.ruta}
            to={sub.ruta}
            role="tab"
            className={({ isActive }) =>
              [
                'flex-1 rounded-pill px-3 py-2 text-center text-sm font-semibold whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-accent-fill text-on-accent'
                  : 'text-muted hover:bg-surface hover:text-text',
              ].join(' ')
            }
          >
            {sub.etiqueta}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </>
  )
}
