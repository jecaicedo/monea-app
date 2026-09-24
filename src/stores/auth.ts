import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'

import { mensajeDeError } from '@/lib/errores'
import { asegurarPresupuestoInicializado } from '@/lib/inicializacion'
import { supabase } from '@/lib/supabase'

/**
 * Store de autenticación.
 *
 * Es la única fuente de verdad sobre "¿hay alguien conectado?". Se mantiene
 * sincronizado con Supabase mediante onAuthStateChange, así que también reacciona
 * a cosas que pasan fuera de la app: token renovado, sesión cerrada en otra
 * pestaña, enlace de confirmación abierto en el correo.
 */

export interface ResultadoAuth {
  ok: boolean
  /** Mensaje de error listo para mostrar, si ok es false. */
  mensaje?: string
  /** true cuando el registro salió bien pero falta confirmar el correo. */
  requiereConfirmacion?: boolean
}

interface EstadoAuth {
  sesion: Session | null
  usuario: User | null
  /** true mientras aún no sabemos si hay sesión (primer arranque de la app). */
  cargandoSesion: boolean

  registrar: (datos: {
    nombre: string
    correo: string
    contrasena: string
  }) => Promise<ResultadoAuth>
  iniciarSesion: (datos: { correo: string; contrasena: string }) => Promise<ResultadoAuth>
  cerrarSesion: () => Promise<void>
}

export const useAuth = create<EstadoAuth>()((set) => ({
  sesion: null,
  usuario: null,
  cargandoSesion: true,

  registrar: async ({ nombre, correo, contrasena }) => {
    const { data, error } = await supabase.auth.signUp({
      email: correo.trim(),
      password: contrasena,
      options: {
        // Estos metadatos los lee el trigger `manejar_nuevo_usuario()` del
        // backend para llenar perfiles.nombre al crear la cuenta.
        data: { nombre: nombre.trim() },
        // A dónde vuelve el usuario al abrir el enlace de confirmación.
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) return { ok: false, mensaje: mensajeDeError(error) }

    // Si el proyecto tiene confirmación de correo activada, signUp devuelve
    // usuario pero sin sesión: hay que confirmar antes de poder entrar.
    if (data.user && !data.session) {
      return { ok: true, requiereConfirmacion: true }
    }

    // Con confirmación desactivada ya hay sesión; el listener de más abajo se
    // encarga de sembrar el presupuesto.
    return { ok: true }
  },

  iniciarSesion: async ({ correo, contrasena }) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: contrasena,
    })

    if (error) return { ok: false, mensaje: mensajeDeError(error) }
    return { ok: true }
  },

  cerrarSesion: async () => {
    await supabase.auth.signOut()
    set({ sesion: null, usuario: null })
  },
}))

/* -------------------------------------------------------------------------- */
/* Sincronización con Supabase                                                */
/* -------------------------------------------------------------------------- */

let yaInicializado = false

/**
 * Conecta el store con Supabase. Se llama UNA vez desde main.tsx, fuera de
 * React, para que StrictMode (que monta los componentes dos veces en
 * desarrollo) no duplique la suscripción.
 */
export function inicializarAuth(): void {
  if (yaInicializado) return
  yaInicializado = true

  // Sesión que haya quedado guardada de una visita anterior.
  supabase.auth
    .getSession()
    .then(({ data }) => {
      useAuth.setState({
        sesion: data.session,
        usuario: data.session?.user ?? null,
        cargandoSesion: false,
      })
    })
    .catch((error: unknown) => {
      console.error('[auth] no se pudo leer la sesión guardada:', error)
      useAuth.setState({ cargandoSesion: false })
    })

  supabase.auth.onAuthStateChange((evento, sesion) => {
    useAuth.setState({
      sesion,
      usuario: sesion?.user ?? null,
      cargandoSesion: false,
    })

    if (evento === 'SIGNED_IN' && sesion?.user) {
      const usuarioId = sesion.user.id
      // IMPORTANTE: no se puede llamar a otras funciones de supabase-js dentro
      // de este callback (el cliente queda bloqueado esperando y la petición
      // nunca resuelve). Lo sacamos del callback con un setTimeout.
      setTimeout(() => {
        void asegurarPresupuestoInicializado(usuarioId)
      }, 0)
    }
  })
}
