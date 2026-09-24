import { IconoCargando } from './ui/iconos'

/**
 * Pantalla completa de carga. Se usa mientras averiguamos si hay sesion
 * guardada, antes de decidir si mostrar la app o el login.
 */
export function PantallaCargando({ mensaje = 'Cargando…' }: { mensaje?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg text-muted">
      <div className="flex flex-col items-center gap-3">
        <IconoCargando className="size-7 animate-spin text-accent" />
        <p className="text-sm">{mensaje}</p>
      </div>
    </div>
  )
}
