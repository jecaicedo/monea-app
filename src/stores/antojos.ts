import { create } from 'zustand'

import { crearDebouncePorClave } from '@/lib/debounce'
import { comprimirImagen } from '@/lib/imagenes'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/auth'
import type { Antojo } from '@/types/basedatos'

/**
 * Store de Antojos: "tómale foto a lo que quieres y mira en cuánto tiempo te
 * alcanza". Mismo patrón de autosave que los demás stores (ingresos,
 * presupuesto): el cambio se aplica de inmediato en local y se persiste tras
 * un debounce de 700ms por fila.
 *
 * Las fotos viven en el bucket privado "antojos" (ruta {user_id}/{id}.jpg,
 * ver supabase/migrations/0009_storage_antojos.sql) y se muestran con signed
 * URLs, calculadas al cargar la lista y guardadas en `urlsFirmadas` por ruta.
 */

const BUCKET_ANTOJOS = 'antojos'
const VENCIMIENTO_URL_FIRMADA_SEGUNDOS = 3600

const ESPERA_AUTOGUARDADO_MS = 700
const debounceAntojos = crearDebouncePorClave(ESPERA_AUTOGUARDADO_MS)
const cambiosPendientes = new Map<string, CamposEditablesAntojo>()

export type CamposEditablesAntojo = Partial<Pick<Antojo, 'nombre' | 'precio'>>

interface EstadoAntojos {
  antojos: Antojo[]
  /** Signed URL vigente de cada foto, indexada por `foto_path`. */
  urlsFirmadas: Record<string, string>
  cargando: boolean
  error: string | null
  /** Ids con un guardado de nombre/precio pendiente o en curso. */
  guardando: Set<string>
  /** Ids con una subida de foto en curso (solo aplica al crear). */
  subiendoFoto: Set<string>

  cargar: () => Promise<void>
  crear: (nombre: string, precio: number, foto?: File | null) => Promise<void>
  actualizar: (id: string, cambios: CamposEditablesAntojo) => void
  eliminar: (id: string) => Promise<void>
}

/** Pide las signed URLs de una tanda de rutas y las devuelve indexadas por ruta. */
async function obtenerUrlsFirmadas(rutas: string[]): Promise<Record<string, string>> {
  if (rutas.length === 0) return {}

  const { data, error } = await supabase.storage
    .from(BUCKET_ANTOJOS)
    .createSignedUrls(rutas, VENCIMIENTO_URL_FIRMADA_SEGUNDOS)
  if (error || !data) return {}

  const urls: Record<string, string> = {}
  for (const fila of data) {
    if (fila.signedUrl) urls[fila.path ?? ''] = fila.signedUrl
  }
  return urls
}

export const useAntojos = create<EstadoAntojos>()((set, get) => {
  async function guardar(id: string) {
    const cambios = cambiosPendientes.get(id)
    cambiosPendientes.delete(id)
    if (!cambios) return

    const { error } = await supabase.from('antojos').update(cambios).eq('id', id)

    set((estado) => {
      const guardando = new Set(estado.guardando)
      guardando.delete(id)
      return { guardando, error: error ? error.message : estado.error }
    })
  }

  return {
    antojos: [],
    urlsFirmadas: {},
    cargando: true,
    error: null,
    guardando: new Set(),
    subiendoFoto: new Set(),

    cargar: async () => {
      set({ cargando: true, error: null })

      const { data, error } = await supabase.from('antojos').select('*').order('created_at', { ascending: false })
      if (error) {
        set({ cargando: false, error: error.message })
        return
      }

      const antojos = data ?? []
      const rutas = antojos.map((a) => a.foto_path).filter((ruta): ruta is string => Boolean(ruta))
      const urlsFirmadas = await obtenerUrlsFirmadas(rutas)

      set({ antojos, urlsFirmadas, cargando: false })
    },

    crear: async (nombre, precio, foto) => {
      const usuarioId = useAuth.getState().usuario?.id
      if (!usuarioId) return

      const { data, error } = await supabase
        .from('antojos')
        .insert({ user_id: usuarioId, nombre, precio })
        .select()
        .single()

      if (error || !data) {
        set({ error: error?.message ?? 'No se pudo crear el antojo.' })
        return
      }

      set((estado) => ({ antojos: [data, ...estado.antojos] }))

      if (!foto) return

      set((estado) => ({ subiendoFoto: new Set(estado.subiendoFoto).add(data.id) }))

      try {
        const comprimida = await comprimirImagen(foto)
        const ruta = `${usuarioId}/${data.id}.jpg`

        const { error: errorSubida } = await supabase.storage
          .from(BUCKET_ANTOJOS)
          .upload(ruta, comprimida, { contentType: 'image/jpeg', upsert: true })
        if (errorSubida) throw errorSubida

        const { error: errorActualizar } = await supabase
          .from('antojos')
          .update({ foto_path: ruta })
          .eq('id', data.id)
        if (errorActualizar) throw errorActualizar

        const urls = await obtenerUrlsFirmadas([ruta])
        set((estado) => ({
          antojos: estado.antojos.map((a) => (a.id === data.id ? { ...a, foto_path: ruta } : a)),
          urlsFirmadas: { ...estado.urlsFirmadas, ...urls },
        }))
      } catch {
        // El antojo ya quedó creado sin foto: no se pierde el registro, solo
        // avisamos de que la imagen no se pudo subir.
        set({ error: 'El antojo se guardó, pero no se pudo subir la foto. Puedes intentar de nuevo más tarde.' })
      } finally {
        set((estado) => {
          const subiendoFoto = new Set(estado.subiendoFoto)
          subiendoFoto.delete(data.id)
          return { subiendoFoto }
        })
      }
    },

    actualizar: (id, cambios) => {
      set((estado) => ({
        antojos: estado.antojos.map((antojo) => (antojo.id === id ? { ...antojo, ...cambios } : antojo)),
      }))

      cambiosPendientes.set(id, { ...cambiosPendientes.get(id), ...cambios })
      set((estado) => ({ guardando: new Set(estado.guardando).add(id) }))
      debounceAntojos.programar(id, () => void guardar(id))
    },

    eliminar: async (id) => {
      debounceAntojos.cancelar(id)
      cambiosPendientes.delete(id)

      const antojo = get().antojos.find((a) => a.id === id)

      set((estado) => ({ antojos: estado.antojos.filter((a) => a.id !== id) }))

      const { error } = await supabase.from('antojos').delete().eq('id', id)
      if (error) {
        set({ error: error.message })
        void get().cargar()
        return
      }

      if (antojo?.foto_path) {
        await supabase.storage.from(BUCKET_ANTOJOS).remove([antojo.foto_path])
      }
    },
  }
})
