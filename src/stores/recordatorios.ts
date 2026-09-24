import { create } from 'zustand'

import { crearDebouncePorClave } from '@/lib/debounce'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/auth'
import type { Recordatorio, Recurrencia, TipoRecordatorio } from '@/types/basedatos'

/**
 * Store de Recordatorios: pagos, tarjetas, cumpleaños, pico y placa y otros.
 * Mismo patrón de autosave que los demás stores: el cambio se aplica de
 * inmediato en local y se persiste tras un debounce de 700ms por fila.
 *
 * La proximidad ("vencido"/"próximo") y la próxima ocurrencia de los
 * recurrentes NO se guardan aquí: se calculan en vivo con `lib/recordatorios.ts`
 * a partir de `fecha` y `recurrencia`, cada vez que se muestran.
 */

const ESPERA_AUTOGUARDADO_MS = 700
const debounceRecordatorios = crearDebouncePorClave(ESPERA_AUTOGUARDADO_MS)
const cambiosPendientes = new Map<string, CamposEditablesRecordatorio>()

export type CamposEditablesRecordatorio = Partial<
  Pick<Recordatorio, 'tipo' | 'titulo' | 'fecha' | 'recurrencia' | 'notificar'>
>

interface CamposNuevoRecordatorio {
  tipo: TipoRecordatorio
  titulo: string
  fecha: string
  recurrencia: Recurrencia | null
  notificar: boolean
}

interface EstadoRecordatorios {
  recordatorios: Recordatorio[]
  cargando: boolean
  error: string | null
  /** Ids con un guardado pendiente o en curso. */
  guardando: Set<string>

  cargar: () => Promise<void>
  crear: (campos: CamposNuevoRecordatorio) => Promise<void>
  actualizar: (id: string, cambios: CamposEditablesRecordatorio) => void
  eliminar: (id: string) => Promise<void>
}

export const useRecordatorios = create<EstadoRecordatorios>()((set, get) => {
  async function guardar(id: string) {
    const cambios = cambiosPendientes.get(id)
    cambiosPendientes.delete(id)
    if (!cambios) return

    const { error } = await supabase.from('recordatorios').update(cambios).eq('id', id)

    set((estado) => {
      const guardando = new Set(estado.guardando)
      guardando.delete(id)
      return { guardando, error: error ? error.message : estado.error }
    })
  }

  return {
    recordatorios: [],
    cargando: true,
    error: null,
    guardando: new Set(),

    cargar: async () => {
      set({ cargando: true, error: null })

      const { data, error } = await supabase.from('recordatorios').select('*').order('fecha')
      if (error) {
        set({ cargando: false, error: error.message })
        return
      }

      set({ recordatorios: data ?? [], cargando: false })
    },

    crear: async (campos) => {
      const usuarioId = useAuth.getState().usuario?.id
      if (!usuarioId) return

      const { data, error } = await supabase
        .from('recordatorios')
        .insert({ user_id: usuarioId, ...campos })
        .select()
        .single()

      if (error || !data) {
        set({ error: error?.message ?? 'No se pudo crear el recordatorio.' })
        return
      }

      set((estado) => ({ recordatorios: [...estado.recordatorios, data] }))
    },

    actualizar: (id, cambios) => {
      set((estado) => ({
        recordatorios: estado.recordatorios.map((r) => (r.id === id ? { ...r, ...cambios } : r)),
      }))

      // `notificar` por ahora solo se guarda. El envío real (Web Push + Edge
      // Function + cron, etapa 7B-2) leerá este campo desde el backend; aquí
      // no hay que tocar nada más cuando esa etapa llegue.
      cambiosPendientes.set(id, { ...cambiosPendientes.get(id), ...cambios })
      set((estado) => ({ guardando: new Set(estado.guardando).add(id) }))
      debounceRecordatorios.programar(id, () => void guardar(id))
    },

    eliminar: async (id) => {
      debounceRecordatorios.cancelar(id)
      cambiosPendientes.delete(id)

      set((estado) => ({ recordatorios: estado.recordatorios.filter((r) => r.id !== id) }))

      const { error } = await supabase.from('recordatorios').delete().eq('id', id)
      if (error) {
        set({ error: error.message })
        void get().cargar()
      }
    },
  }
})
