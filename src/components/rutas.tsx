import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { PantallaCargando } from '@/components/PantallaCargando'
import { useAuth } from '@/stores/auth'

/**
 * Guardas de navegación.
 *
 * Mientras `cargandoSesion` sea true no decidimos nada: si redirigiéramos de
 * una, el usuario con sesión válida vería un parpadeo del login en cada
 * recarga, porque leer la sesión de localStorage es asíncrono.
 */

/** Envuelve las rutas que exigen sesión. Sin sesión, manda al login. */
export function RutaProtegida() {
  const cargandoSesion = useAuth((estado) => estado.cargandoSesion)
  const sesion = useAuth((estado) => estado.sesion)
  const ubicacion = useLocation()

  if (cargandoSesion) return <PantallaCargando mensaje="Verificando tu sesión…" />

  if (!sesion) {
    // Guardamos a dónde iba para devolverlo ahí después de entrar.
    return <Navigate to="/entrar" state={{ desde: ubicacion.pathname }} replace />
  }

  return <Outlet />
}

/** Envuelve login y registro. Con sesión activa, manda a la app. */
export function RutaPublica() {
  const cargandoSesion = useAuth((estado) => estado.cargandoSesion)
  const sesion = useAuth((estado) => estado.sesion)

  if (cargandoSesion) return <PantallaCargando />

  if (sesion) return <Navigate to="/" replace />

  return <Outlet />
}
