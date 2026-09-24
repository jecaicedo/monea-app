import { create } from 'zustand'

import { crearDebouncePorClave } from '@/lib/debounce'
import { calcularFondoLogrado, calcularEnPositivo, estaMetaLograda } from '@/lib/metas'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/auth'
import type { Meta, TipoMeta } from '@/types/basedatos'

/**
 * Store de Metas: la etapa "Pasar en positivo" (derivada, no editable), el
 * "Fondo de emergencia" y las metas propias del usuario. Mismo patrón de
 * autosave que `ingresos.ts`/`presupuesto.ts`.
 *
 * IMPORTANTE: el campo `estado` (y `fecha_lograda`) de cada fila se escribe
 * aquí solo como REFERENCIA/historial — la pantalla de Metas NUNCA decide qué
 * mostrar ni qué bloquear a partir de `estado`. La cascada completa se
 * recalcula siempre en vivo con las funciones de `lib/metas.ts`, así que todo
 * es reversible sin depender de un flag que se quedó viejo.
 */

const ESPERA_AUTOGUARDADO_MS = 700

const debounceMetas = crearDebouncePorClave(ESPERA_AUTOGUARDADO_MS)

export type CamposEditablesMeta = Partial<Pick<Meta, 'nombre' | 'monto_objetivo' | 'monto_actual' | 'banco'>>

/** Lo que de verdad viaja a Supabase: los campos editables más el `estado`
 *  derivado que se recalcula junto con ellos (ver `actualizarMeta`). */
type CamposAGuardar = CamposEditablesMeta & Partial<Pick<Meta, 'estado' | 'fecha_lograda'>>

const cambiosPendientes = new Map<string, CamposAGuardar>()

interface EstadoMetas {
  metas: Meta[]
  cargando: boolean
  error: string | null
  guardando: Set<string>
  /** Último excedente conocido (ingresos − gastos − ahorro), para poder
   *  recalcular "Fondo de emergencia" cada vez que se edita su monto sin
   *  tener que pedírselo de nuevo a quien llama. */
  ultimoExcedente: number

  cargar: () => Promise<void>
  /** Recalcula "Pasar en positivo" y "Fondo de emergencia" contra el
   *  excedente actual, y corrige en Supabase las filas cuyo `estado`
   *  guardado ya no coincide con la realidad en vivo. */
  sincronizarConExcedente: (excedente: number) => Promise<void>
  actualizarMeta: (id: string, cambios: CamposEditablesMeta) => void
  crearMeta: (nombre: string, montoObjetivo: number, banco?: string | null) => Promise<void>
  eliminarMeta: (id: string) => Promise<void>
}

/** `estado`/`fecha_lograda` que le corresponden a una meta según si está lograda AHORA. */
function estadoParaLograda(lograda: boolean, fechaPrevia: string | null): Pick<Meta, 'estado' | 'fecha_lograda'> {
  if (lograda) return { estado: 'lograda', fecha_lograda: fechaPrevia ?? new Date().toISOString() }
  return { estado: 'activa', fecha_lograda: null }
}

export const useMetas = create<EstadoMetas>()((set, get) => {
  async function guardarMeta(id: string) {
    const cambios = cambiosPendientes.get(id)
    cambiosPendientes.delete(id)
    if (!cambios) return

    const { error } = await supabase.from('metas').update(cambios).eq('id', id)

    set((estado) => {
      const guardando = new Set(estado.guardando)
      guardando.delete(id)
      return { guardando, error: error ? error.message : estado.error }
    })
  }

  return {
    metas: [],
    cargando: true,
    error: null,
    guardando: new Set(),
    ultimoExcedente: 0,

    cargar: async () => {
      set({ cargando: true, error: null })

      const { data, error } = await supabase.from('metas').select('*').order('orden')
      if (error) {
        set({ cargando: false, error: error.message })
        return
      }

      const metas = data ?? []
      const usuarioId = useAuth.getState().usuario?.id

      // Red de seguridad: inicializar_presupuesto() ya crea estas dos, pero
      // si por lo que sea faltan, se crean aquí sin duplicar.
      const faltantes: TipoMeta[] = []
      if (usuarioId) {
        if (!metas.some((m) => m.tipo === 'pasar_positivo')) faltantes.push('pasar_positivo')
        if (!metas.some((m) => m.tipo === 'fondo_emergencia')) faltantes.push('fondo_emergencia')
      }

      if (faltantes.length > 0 && usuarioId) {
        const nombresPorTipo: Record<TipoMeta, string> = {
          pasar_positivo: 'Pasar en positivo',
          fondo_emergencia: 'Fondo de emergencia',
          meta: 'Meta',
        }
        const { data: creadas } = await supabase
          .from('metas')
          .insert(faltantes.map((tipo) => ({ user_id: usuarioId, tipo, nombre: nombresPorTipo[tipo] })))
          .select()
        if (creadas) metas.push(...creadas)
      }

      set({ metas, cargando: false })
    },

    sincronizarConExcedente: async (excedente) => {
      set({ ultimoExcedente: excedente })

      const enPositivo = calcularEnPositivo(excedente)
      const metaPositivo = get().metas.find((m) => m.tipo === 'pasar_positivo')
      const metaFondo = get().metas.find((m) => m.tipo === 'fondo_emergencia')

      const actualizaciones: { id: string; cambios: Pick<Meta, 'estado' | 'fecha_lograda'> }[] = []

      if (metaPositivo) {
        const nuevoEstado = estadoParaLograda(enPositivo, metaPositivo.fecha_lograda)
        if (nuevoEstado.estado !== metaPositivo.estado) actualizaciones.push({ id: metaPositivo.id, cambios: nuevoEstado })
      }
      if (metaFondo) {
        const logrado = calcularFondoLogrado(metaFondo, enPositivo)
        const nuevoEstado = estadoParaLograda(logrado, metaFondo.fecha_lograda)
        if (nuevoEstado.estado !== metaFondo.estado) actualizaciones.push({ id: metaFondo.id, cambios: nuevoEstado })
      }

      if (actualizaciones.length === 0) return

      set((estado) => ({
        metas: estado.metas.map((meta) => {
          const actualizacion = actualizaciones.find((a) => a.id === meta.id)
          return actualizacion ? { ...meta, ...actualizacion.cambios } : meta
        }),
      }))

      await Promise.all(
        actualizaciones.map(({ id, cambios }) => supabase.from('metas').update(cambios).eq('id', id)),
      )
    },

    actualizarMeta: (id, cambios) => {
      set((estado) => ({
        metas: estado.metas.map((meta) => {
          if (meta.id !== id) return meta
          const actualizada = { ...meta, ...cambios }

          // El fondo depende también de si se sigue en positivo; una meta
          // propia solo depende de sus propios montos.
          const lograda =
            actualizada.tipo === 'fondo_emergencia'
              ? calcularFondoLogrado(actualizada, calcularEnPositivo(get().ultimoExcedente))
              : estaMetaLograda(actualizada)

          return { ...actualizada, ...estadoParaLograda(lograda, actualizada.fecha_lograda) }
        }),
      }))

      const metaActualizada = get().metas.find((m) => m.id === id)
      const cambiosCompletos: CamposAGuardar = {
        ...cambios,
        estado: metaActualizada?.estado,
        fecha_lograda: metaActualizada?.fecha_lograda,
      }

      cambiosPendientes.set(id, { ...cambiosPendientes.get(id), ...cambiosCompletos })
      set((estado) => ({ guardando: new Set(estado.guardando).add(id) }))
      debounceMetas.programar(id, () => void guardarMeta(id))
    },

    crearMeta: async (nombre, montoObjetivo, banco = null) => {
      const usuarioId = useAuth.getState().usuario?.id
      if (!usuarioId) return

      const orden = get().metas.filter((m) => m.tipo === 'meta').length

      const { data, error } = await supabase
        .from('metas')
        .insert({ user_id: usuarioId, tipo: 'meta', nombre, monto_objetivo: montoObjetivo, banco, orden })
        .select()
        .single()

      if (error || !data) {
        set({ error: error?.message ?? 'No se pudo crear la meta.' })
        return
      }

      set((estado) => ({ metas: [...estado.metas, data] }))
    },

    eliminarMeta: async (id) => {
      debounceMetas.cancelar(id)
      cambiosPendientes.delete(id)

      set((estado) => ({ metas: estado.metas.filter((meta) => meta.id !== id) }))

      const { error } = await supabase.from('metas').delete().eq('id', id)
      if (error) {
        set({ error: error.message })
        void get().cargar()
      }
    },
  }
})
