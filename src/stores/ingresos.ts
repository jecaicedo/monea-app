import { create } from 'zustand'

import { crearDebouncePorClave } from '@/lib/debounce'
import { netoIngreso, normalizarAMensual } from '@/lib/finanzas'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/auth'
import type { DeduccionPersonalizada, Ingreso } from '@/types/basedatos'

/**
 * Store de Ingresos: fuentes de ingreso del usuario y sus descuentos
 * personalizados. Alimenta la sub-pestaña "Actualiza" de Presupuesto.
 *
 * Autosave: cada cambio se aplica de inmediato al estado local (la UI nunca
 * espera a la red) y se persiste en Supabase tras un debounce de 700ms por
 * fila — así, si el usuario escribe en dos tarjetas a la vez, cada una guarda
 * por su lado sin pisarse. Los cambios de una misma fila que llegan antes de
 * que el debounce dispare se acumulan y se mandan juntos en una sola escritura.
 */

const ESPERA_AUTOGUARDADO_MS = 700

const debounceIngresos = crearDebouncePorClave(ESPERA_AUTOGUARDADO_MS)
const debounceDeducciones = crearDebouncePorClave(ESPERA_AUTOGUARDADO_MS)

/** Campos de un ingreso que la pantalla de Actualiza deja editar. */
export type CamposEditablesIngreso = Partial<
  Pick<
    Ingreso,
    | 'nombre'
    | 'monto_bruto'
    | 'moneda'
    | 'frecuencia'
    | 'banco'
    | 'salud_pct'
    | 'pension_pct'
    | 'auxilio_transporte'
    | 'prima_anual'
  >
>

export type CamposEditablesDeduccion = Partial<Pick<DeduccionPersonalizada, 'nombre' | 'monto'>>

// Cambios acumulados de cada fila, pendientes de mandar al backend.
const cambiosPendientesIngreso = new Map<string, CamposEditablesIngreso>()
const cambiosPendientesDeduccion = new Map<string, CamposEditablesDeduccion>()

interface EstadoIngresos {
  ingresos: Ingreso[]
  /** Descuentos personalizados, agrupados por el id del ingreso al que pertenecen. */
  deducciones: Record<string, DeduccionPersonalizada[]>
  cargando: boolean
  error: string | null
  /** Ids (de ingresos o de descuentos) con un guardado pendiente o en curso. */
  guardando: Set<string>
  /** Ids de ingresos con la tarjeta EXPANDIDA (acordeón). Vacío = todo contraído. */
  idsAbiertos: Set<string>

  cargar: () => Promise<void>
  crearIngreso: () => Promise<void>
  actualizarIngreso: (id: string, cambios: CamposEditablesIngreso) => void
  eliminarIngreso: (id: string) => Promise<void>
  /** Expande o contrae la tarjeta de un ingreso. Cada una es independiente. */
  alternarAbierto: (id: string) => void

  crearDeduccion: (ingresoId: string, nombre: string, monto: number) => Promise<void>
  actualizarDeduccion: (id: string, cambios: CamposEditablesDeduccion) => void
  eliminarDeduccion: (id: string) => Promise<void>
}

export const useIngresos = create<EstadoIngresos>()((set, get) => {
  /** Manda a Supabase los cambios acumulados de un ingreso y limpia su marca de "guardando". */
  async function guardarIngreso(id: string) {
    const cambios = cambiosPendientesIngreso.get(id)
    cambiosPendientesIngreso.delete(id)
    if (!cambios) return

    const { error } = await supabase.from('ingresos').update(cambios).eq('id', id)

    set((estado) => {
      const guardando = new Set(estado.guardando)
      guardando.delete(id)
      return { guardando, error: error ? error.message : estado.error }
    })
  }

  /** Igual que guardarIngreso pero para una fila de deducciones_personalizadas. */
  async function guardarDeduccion(id: string) {
    const cambios = cambiosPendientesDeduccion.get(id)
    cambiosPendientesDeduccion.delete(id)
    if (!cambios) return

    const { error } = await supabase.from('deducciones_personalizadas').update(cambios).eq('id', id)

    set((estado) => {
      const guardando = new Set(estado.guardando)
      guardando.delete(id)
      return { guardando, error: error ? error.message : estado.error }
    })
  }

  return {
    ingresos: [],
    deducciones: {},
    cargando: true,
    error: null,
    guardando: new Set(),
    // Vacío a propósito: los ingresos ya existentes cargan CONTRAÍDOS.
    idsAbiertos: new Set(),

    cargar: async () => {
      set({ cargando: true, error: null })

      const [{ data: ingresos, error: errorIngresos }, { data: deducciones, error: errorDeducciones }] =
        await Promise.all([
          supabase.from('ingresos').select('*').order('orden'),
          supabase.from('deducciones_personalizadas').select('*'),
        ])

      if (errorIngresos || errorDeducciones) {
        set({ cargando: false, error: (errorIngresos ?? errorDeducciones)?.message ?? 'Error desconocido' })
        return
      }

      const porIngreso: Record<string, DeduccionPersonalizada[]> = {}
      for (const deduccion of deducciones ?? []) {
        ;(porIngreso[deduccion.ingreso_id] ??= []).push(deduccion)
      }

      set({ ingresos: ingresos ?? [], deducciones: porIngreso, cargando: false })
    },

    crearIngreso: async () => {
      const usuarioId = useAuth.getState().usuario?.id
      if (!usuarioId) return

      const orden = get().ingresos.length

      const { data, error } = await supabase
        .from('ingresos')
        .insert({ user_id: usuarioId, nombre: 'Nuevo ingreso', orden })
        .select()
        .single()

      if (error || !data) {
        set({ error: error?.message ?? 'No se pudo crear el ingreso.' })
        return
      }

      // El ingreso nuevo nace EXPANDIDO, para que el usuario lo llene ya
      // mismo; los que ya existían se quedan como estaban.
      set((estado) => ({
        ingresos: [...estado.ingresos, data],
        idsAbiertos: new Set(estado.idsAbiertos).add(data.id),
      }))
    },

    actualizarIngreso: (id, cambios) => {
      // 1. Aplica el cambio ya, en el estado local: la UI nunca espera la red.
      set((estado) => ({
        ingresos: estado.ingresos.map((ingreso) =>
          ingreso.id === id ? { ...ingreso, ...cambios } : ingreso,
        ),
      }))

      // 2. Acumula el cambio y programa (o reinicia) el guardado diferido.
      cambiosPendientesIngreso.set(id, { ...cambiosPendientesIngreso.get(id), ...cambios })
      set((estado) => ({ guardando: new Set(estado.guardando).add(id) }))
      debounceIngresos.programar(id, () => void guardarIngreso(id))
    },

    eliminarIngreso: async (id) => {
      debounceIngresos.cancelar(id)
      cambiosPendientesIngreso.delete(id)

      set((estado) => {
        const deducciones = { ...estado.deducciones }
        delete deducciones[id]
        const idsAbiertos = new Set(estado.idsAbiertos)
        idsAbiertos.delete(id)
        return {
          ingresos: estado.ingresos.filter((ingreso) => ingreso.id !== id),
          deducciones,
          idsAbiertos,
        }
      })

      const { error } = await supabase.from('ingresos').delete().eq('id', id)
      if (error) {
        set({ error: error.message })
        // Algo salió mal borrando en el servidor: resincronizamos con lo que
        // realmente quedó guardado, en vez de dejar la UI mintiendo.
        void get().cargar()
      }
    },

    alternarAbierto: (id) => {
      set((estado) => {
        const idsAbiertos = new Set(estado.idsAbiertos)
        if (idsAbiertos.has(id)) idsAbiertos.delete(id)
        else idsAbiertos.add(id)
        return { idsAbiertos }
      })
    },

    crearDeduccion: async (ingresoId, nombre, monto) => {
      const usuarioId = useAuth.getState().usuario?.id
      if (!usuarioId) return

      const { data, error } = await supabase
        .from('deducciones_personalizadas')
        .insert({ user_id: usuarioId, ingreso_id: ingresoId, nombre, monto })
        .select()
        .single()

      if (error || !data) {
        set({ error: error?.message ?? 'No se pudo crear el descuento.' })
        return
      }

      set((estado) => ({
        deducciones: {
          ...estado.deducciones,
          [ingresoId]: [...(estado.deducciones[ingresoId] ?? []), data],
        },
      }))
    },

    actualizarDeduccion: (id, cambios) => {
      set((estado) => {
        const deducciones = { ...estado.deducciones }
        for (const ingresoId of Object.keys(deducciones)) {
          deducciones[ingresoId] = deducciones[ingresoId].map((deduccion) =>
            deduccion.id === id ? { ...deduccion, ...cambios } : deduccion,
          )
        }
        return { deducciones }
      })

      cambiosPendientesDeduccion.set(id, { ...cambiosPendientesDeduccion.get(id), ...cambios })
      set((estado) => ({ guardando: new Set(estado.guardando).add(id) }))
      debounceDeducciones.programar(id, () => void guardarDeduccion(id))
    },

    eliminarDeduccion: async (id) => {
      debounceDeducciones.cancelar(id)
      cambiosPendientesDeduccion.delete(id)

      set((estado) => {
        const deducciones = { ...estado.deducciones }
        for (const ingresoId of Object.keys(deducciones)) {
          deducciones[ingresoId] = deducciones[ingresoId].filter((deduccion) => deduccion.id !== id)
        }
        return { deducciones }
      })

      const { error } = await supabase.from('deducciones_personalizadas').delete().eq('id', id)
      if (error) {
        set({ error: error.message })
        void get().cargar()
      }
    },
  }
})

/**
 * Suma los netos mensuales de todos los ingresos: "Total que te entra al mes".
 * Función pura (no lee el store) para poder reutilizarla tanto en la barra de
 * resumen como en el pie de la lista de ingresos, con los mismos datos.
 */
export function calcularTotalIngresosNetos(
  ingresos: Ingreso[],
  deducciones: Record<string, DeduccionPersonalizada[]>,
): number {
  return ingresos.reduce((suma, ingreso) => {
    const montosDescuentos = (deducciones[ingreso.id] ?? []).map((deduccion) => deduccion.monto)
    const neto = netoIngreso(ingreso, montosDescuentos)
    return suma + normalizarAMensual(neto, ingreso.frecuencia)
  }, 0)
}
