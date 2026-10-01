/// <reference types="vite/client" />

// Tipado de las variables de entorno de la app, para que import.meta.env
// autocomplete y avise si escribes mal un nombre.
interface ImportMetaEnv {
  /** URL del proyecto de Supabase, ej. https://xxxx.supabase.co */
  readonly VITE_SUPABASE_URL: string
  /** Llave publica "anon" del proyecto. Es publica por diseno: RLS es lo que protege. */
  readonly VITE_SUPABASE_ANON_KEY: string
  /**
   * Llave VAPID PUBLICA para Web Push. Es publica por diseno: el navegador la
   * manda al suscribirse. La privada vive solo como secreto de la Edge
   * Function, nunca aqui.
   */
  readonly VITE_VAPID_PUBLIC_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
