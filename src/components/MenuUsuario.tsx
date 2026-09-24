import { useEffect, useRef, useState } from 'react'

import { IconoFlechaAbajo, IconoSalir } from '@/components/ui/iconos'
import { useAuth } from '@/stores/auth'

/**
 * Avatar con la inicial del usuario. Al tocarlo despliega el menú con la
 * opción de cerrar sesión.
 */

/** Saca la inicial del nombre; si no hay nombre, del correo. */
function inicialDe(nombre: string | undefined, correo: string | undefined): string {
  const base = nombre?.trim() || correo?.trim() || '?'
  return base.charAt(0).toUpperCase()
}

export function MenuUsuario() {
  const usuario = useAuth((estado) => estado.usuario)
  const cerrarSesion = useAuth((estado) => estado.cerrarSesion)

  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)

  const nombre =
    typeof usuario?.user_metadata?.nombre === 'string' ? usuario.user_metadata.nombre : undefined
  const correo = usuario?.email

  // Cierra el menú al tocar fuera o al presionar Escape.
  useEffect(() => {
    if (!abierto) return

    function alTocarFuera(evento: MouseEvent) {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false)
    }
    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAbierto(false)
    }

    document.addEventListener('mousedown', alTocarFuera)
    document.addEventListener('keydown', alPresionarTecla)
    return () => {
      document.removeEventListener('mousedown', alTocarFuera)
      document.removeEventListener('keydown', alPresionarTecla)
    }
  }, [abierto])

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Menú de la cuenta"
        className="flex items-center gap-1 rounded-pill p-1 transition-colors hover:bg-surface-2"
      >
        <span className="grid size-8 place-items-center rounded-pill bg-accent-fill font-display text-sm font-bold text-on-accent">
          {inicialDe(nombre, correo)}
        </span>
        <IconoFlechaAbajo
          className={`size-4 text-muted transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-card border border-border bg-surface shadow-card"
        >
          <div className="border-b border-border px-4 py-3">
            {nombre && <p className="truncate text-sm font-semibold text-text">{nombre}</p>}
            <p className="truncate text-xs text-muted">{correo}</p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAbierto(false)
              void cerrarSesion()
            }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
          >
            <IconoSalir className="size-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
