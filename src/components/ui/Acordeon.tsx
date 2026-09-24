import type { ReactNode } from 'react'

/**
 * Primitivo de acordeón: anima la apertura/cierre de `children` con una
 * transición de altura y opacidad suaves, sin medir alturas con JS — usa el
 * truco de CSS `grid-template-rows: 0fr -> 1fr` (con `overflow-hidden` en el
 * contenedor interno), soportado por todos los navegadores modernos.
 *
 * No impone ningún diseño de encabezado: cada quien arma su propio
 * `encabezado` (un botón, una fila con un input, lo que haga falta) y decide
 * cuándo togglear `abierta`. Es la base de SeccionExpandible (sub-secciones
 * dentro de una tarjeta) y de la tarjeta de ingreso completa; en la Etapa 4
 * las categorías de Bolsillos reutilizan el mismo primitivo.
 */
interface Props {
  abierta: boolean
  encabezado: ReactNode
  children: ReactNode
  /** Clases del contenedor del cuerpo (padding, borde superior, etc). */
  claseCuerpo?: string
}

export function Acordeon({ abierta, encabezado, children, claseCuerpo = '' }: Props) {
  return (
    <>
      {encabezado}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          abierta ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className={`transition-opacity duration-200 ${abierta ? 'opacity-100' : 'opacity-0'} ${claseCuerpo}`}>
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
