import { create } from 'zustand'

import { crearDebouncePorClave } from '@/lib/debounce'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/auth'
import type { HorarioRecordatorio, Recordatorio, Recurrencia, TipoRecordatorio } from '@/types/basedatos'

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
const debounceHorarios = crearDebouncePorClave(ESPERA_AUTOGUARDADO_MS)
const cambiosPendientes = new Map<string, CamposEditablesRecordatorio>()
const horasPendientes = new Map<string, string>()

/** Tope de horarios por recordatorio. El backend lo impone con las ranuras 0-2. */
export const MAX_HORARIOS = 3

/**
 * Horas que se proponen al agregar, en orden. Reparten el día (mañana, tarde,
 * noche) y, como son tres y el tope es tres, siempre queda una libre mientras
 * haya una ranura libre — así nunca chocan con el unique (recordatorio, hora).
 */
export const HORAS_SUGERIDAS = ['08:00', '14:00', '20:00']

/** Si activas "Avisarme" y no eliges ninguna hora, se usa esta. */
export const HORA_POR_DEFECTO = HORAS_SUGERIDAS[0]

/** La primera hora sugerida que no esté ya usada en ese recordatorio. */
export function horaSugerida(horasUsadas: string[]): string {
  const usadas = new Set(horasUsadas.map((hora) => hora.slice(0, 5)))
  return HORAS_SUGERIDAS.find((hora) => !usadas.has(hora)) ?? HORA_POR_DEFECTO
}

/** La ranura libre más baja (0-2), o null si ya están las tres ocupadas. */
function ranuraLibre(horarios: HorarioRecordatorio[]): number | null {
  const ocupadas = new Set(horarios.map((h) => h.orden))
  for (let ranura = 0; ranura < MAX_HORARIOS; ranura++) {
    if (!ocupadas.has(ranura)) return ranura
  }
  return null
}

/** Los horarios se muestran por hora ascendente, no por ranura (ver 0011). */
function porHora(a: HorarioRecordatorio, b: HorarioRecordatorio): number {
  return a.hora.localeCompare(b.hora)
}

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
  /** Horarios de aviso de cada recordatorio, ya ordenados por hora. */
  horariosPorRecordatorio: Record<string, HorarioRecordatorio[]>
  cargando: boolean
  error: string | null
  /** Ids con un guardado pendiente o en curso (de recordatorios y de horarios). */
  guardando: Set<string>

  cargar: () => Promise<void>
  /** Crea el recordatorio y, si pasa horas, sus horarios de aviso. */
  crear: (campos: CamposNuevoRecordatorio, horas?: string[]) => Promise<void>
  actualizar: (id: string, cambios: CamposEditablesRecordatorio) => void
  eliminar: (id: string) => Promise<void>

  agregarHorario: (recordatorioId: string, hora?: string) => Promise<void>
  actualizarHorario: (recordatorioId: string, horarioId: string, hora: string) => void
  eliminarHorario: (recordatorioId: string, horarioId: string) => Promise<void>
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

  async function guardarHora(horarioId: string) {
    const hora = horasPendientes.get(horarioId)
    horasPendientes.delete(horarioId)
    if (!hora) return

    const { error } = await supabase.from('horarios_recordatorio').update({ hora }).eq('id', horarioId)

    set((estado) => {
      const guardando = new Set(estado.guardando)
      guardando.delete(horarioId)
      return { guardando, error: error ? error.message : estado.error }
    })
  }

  return {
    recordatorios: [],
    horariosPorRecordatorio: {},
    cargando: true,
    error: null,
    guardando: new Set(),

    cargar: async () => {
      set({ cargando: true, error: null })

      // Las dos consultas van en paralelo y los horarios se agrupan en memoria:
      // una por recordatorio sería un N+1.
      const [{ data, error }, { data: horarios, error: errorHorarios }] = await Promise.all([
        supabase.from('recordatorios').select('*').order('fecha'),
        supabase.from('horarios_recordatorio').select('*'),
      ])

      const primerError = error ?? errorHorarios
      if (primerError) {
        set({ cargando: false, error: primerError.message })
        return
      }

      const horariosPorRecordatorio: Record<string, HorarioRecordatorio[]> = {}
      for (const horario of horarios ?? []) {
        ;(horariosPorRecordatorio[horario.recordatorio_id] ??= []).push(horario)
      }
      for (const lista of Object.values(horariosPorRecordatorio)) lista.sort(porHora)

      set({ recordatorios: data ?? [], horariosPorRecordatorio, cargando: false })
    },

    crear: async (campos, horas = []) => {
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

      // Los horarios van después y no antes: la FK necesita que el
      // recordatorio ya exista. Solo se guardan si el aviso quedó activo.
      const horasAGuardar = campos.notificar && horas.length === 0 ? [HORA_POR_DEFECTO] : horas
      if (!campos.notificar || horasAGuardar.length === 0) return

      const { data: creados, error: errorHorarios } = await supabase
        .from('horarios_recordatorio')
        .insert(
          horasAGuardar.slice(0, MAX_HORARIOS).map((hora, indice) => ({
            user_id: usuarioId,
            recordatorio_id: data.id,
            hora,
            orden: indice,
          })),
        )
        .select()

      if (errorHorarios) {
        set({ error: errorHorarios.message })
        return
      }

      set((estado) => ({
        horariosPorRecordatorio: {
          ...estado.horariosPorRecordatorio,
          [data.id]: [...(creados ?? [])].sort(porHora),
        },
      }))
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

      set((estado) => {
        // Los horarios caen por CASCADE en la base; aquí se sueltan a mano
        // para no dejarlos colgando en memoria.
        const horariosPorRecordatorio = { ...estado.horariosPorRecordatorio }
        delete horariosPorRecordatorio[id]
        return { recordatorios: estado.recordatorios.filter((r) => r.id !== id), horariosPorRecordatorio }
      })

      const { error } = await supabase.from('recordatorios').delete().eq('id', id)
      if (error) {
        set({ error: error.message })
        void get().cargar()
      }
    },

    agregarHorario: async (recordatorioId, hora) => {
      const usuarioId = useAuth.getState().usuario?.id
      if (!usuarioId) return

      const actuales = get().horariosPorRecordatorio[recordatorioId] ?? []
      const orden = ranuraLibre(actuales)
      if (orden === null) return

      const horaLibre = hora ?? horaSugerida(actuales.map((h) => h.hora))

      const { data, error } = await supabase
        .from('horarios_recordatorio')
        .insert({ user_id: usuarioId, recordatorio_id: recordatorioId, hora: horaLibre, orden })
        .select()
        .single()

      if (error || !data) {
        set({ error: error?.message ?? 'No se pudo agregar el horario.' })
        return
      }

      set((estado) => ({
        horariosPorRecordatorio: {
          ...estado.horariosPorRecordatorio,
          [recordatorioId]: [...(estado.horariosPorRecordatorio[recordatorioId] ?? []), data].sort(porHora),
        },
      }))
    },

    actualizarHorario: (recordatorioId, horarioId, hora) => {
      set((estado) => ({
        horariosPorRecordatorio: {
          ...estado.horariosPorRecordatorio,
          [recordatorioId]: (estado.horariosPorRecordatorio[recordatorioId] ?? [])
            .map((h) => (h.id === horarioId ? { ...h, hora } : h))
            // Sin reordenar mientras se edita: la fila saltaría de sitio bajo
            // el cursor. El orden se reacomoda al recargar la pantalla.
            .slice(),
        },
      }))

      horasPendientes.set(horarioId, hora)
      set((estado) => ({ guardando: new Set(estado.guardando).add(horarioId) }))
      debounceHorarios.programar(horarioId, () => void guardarHora(horarioId))
    },

    eliminarHorario: async (recordatorioId, horarioId) => {
      debounceHorarios.cancelar(horarioId)
      horasPendientes.delete(horarioId)

      set((estado) => ({
        horariosPorRecordatorio: {
          ...estado.horariosPorRecordatorio,
          [recordatorioId]: (estado.horariosPorRecordatorio[recordatorioId] ?? []).filter(
            (h) => h.id !== horarioId,
          ),
        },
      }))

      const { error } = await supabase.from('horarios_recordatorio').delete().eq('id', horarioId)
      if (error) {
        set({ error: error.message })
        void get().cargar()
      }
    },
  }
})
