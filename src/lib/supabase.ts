import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/basedatos'

/**
 * Cliente único de Supabase para toda la app.
 *
 * Las llaves salen de variables de entorno (archivo .env en la raíz, ver
 * .env.example). La llave `anon` es pública por diseño: lo que protege los
 * datos son las políticas RLS del backend, no el secreto de esta llave.
 *
 * NUNCA pongas aquí la `service_role`: esa hace bypass de RLS y quedaría
 * expuesta en el bundle del navegador.
 */

const url = import.meta.env.VITE_SUPABASE_URL
const llaveAnonima = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !llaveAnonima) {
  throw new Error(
    'Faltan las variables de entorno de Supabase.\n' +
      'Copia .env.example a .env y llena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY\n' +
      'con los valores de tu proyecto (Dashboard → Project Settings → API).\n' +
      'Después reinicia `npm run dev`: Vite solo lee el .env al arrancar.',
  )
}

export const supabase = createClient<Database>(url, llaveAnonima, {
  auth: {
    // Mantiene la sesión entre recargas y la renueva sola antes de vencer.
    persistSession: true,
    autoRefreshToken: true,
    // Necesario para los enlaces de confirmación de correo y recuperación.
    detectSessionInUrl: true,
    // Clave propia en localStorage, para no chocar con otros proyectos
    // Supabase abiertos en el mismo navegador durante el desarrollo.
    storageKey: 'miplata:auth',
  },
})
