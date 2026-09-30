import { create } from 'zustand'

import { crearDebouncePorClave } from '@/lib/debounce'
import { compararPeriodos, desplazarPeriodo, esPeriodoEnCurso, MAX_MESES_RACHA, periodoActual } from '@/lib/seguimiento'
import type { ResumenMes } from '@/lib/seguimiento'
import { supabase } from '@/lib/supabase'
import type { SeguimientoMensual } from '@/types/basedatos'

/**
 * Store de "Mes a mes": el seguimiento de cumplimiento de UN mes a la vez.
 *
 * Es un sistema paralelo al presupuesto: lee y escribe solo
 * `seguimiento_mensual` y nunca toca `conceptos`. Los cálculos de Revisa, del
 * diagnóstico y de las metas no dependen de nada de aquí.
 *
 * Mismo patrón de autosave que src/stores/presupuesto.ts: el cambio se aplica
 * de inmediato al estado local y se persiste tras un debounce de 700ms por
 * fila, acumulando los cambios de una misma fila si llegan varios antes de que
 * dispare.
 */

const ESPERA_AUTOGUARDADO_MS = 700

const debounceRegistros = crearDebouncePorClave(ESPERA_AUTOGUARDADO_MS)
const cambiosPendientes = new Map<string, CamposEditablesSeguimiento>()

export type CamposEditablesSeguimiento = Partial<Pick<SeguimientoMensual, 'cumplido' | 'monto_pagado' | 'nota'>>

interface EstadoSeguimiento {
  /** Periodo que se está viendo. Arranca en el mes actual. */
  anio: number
  mes: number
  registros: SeguimientoMensual[]
  cargando: boolean
  error: string | null
  /** Ids de registros con un guardado pendiente o en curso. */
  guardando: Set<string>

  /**
   * Ventana de los últimos meses (cerrados + el actual) con lo mínimo para
   * medir cumplimiento. Alimenta la racha de Metas; es independiente de
   * `registros`, que es el mes que se está viendo en "Mes a mes".
   */
  historial: ResumenMes[]
  cargandoHistorial: boolean

  cargar: (anio: number, mes: number) => Promise<void>
  cargarHistorial: () => Promise<void>
  actualizar: (id: string, cambios: CamposEditablesSeguimiento) => void
}

export const useSeguimientoMensual = create<EstadoSeguimiento>()((set, get) => {
  async function guardar(id: string) {
    const cambios = cambiosPendientes.get(id)
    cambiosPendientes.delete(id)
    if (!cambios) return

    const { error } = await supabase.from('seguimiento_mensual').update(cambios).eq('id', id)

    set((estado) => {
      const guardando = new Set(estado.guardando)
      guardando.delete(id)
      return { guardando, error: error ? error.message : estado.error }
    })
  }

  /** ¿El periodo que se pidió sigue siendo el que se está viendo? */
  function sigueVigente(anio: number, mes: number): boolean {
    const estado = get()
    return estado.anio === anio && estado.mes === mes
  }

  const inicial = periodoActual()

  return {
    anio: inicial.anio,
    mes: inicial.mes,
    registros: [],
    cargando: true,
    error: null,
    guardando: new Set(),
    historial: [],
    cargandoHistorial: true,

    cargar: async (anio, mes) => {
      set({ anio, mes, cargando: true, error: null })

      // El arranque de mes lo hace el backend: crea las filas que falten (mes
      // nuevo, o concepto agregado a mitad de mes en Revisa) en una sola
      // consulta idempotente.
      //
      // Solo para el MES EN CURSO. El historial se consulta, no se siembra:
      // llenar un mes pasado copiaría el presupuesto de hoy a un mes que se
      // vivió con otro, y eso falsearía la racha de Metas. La RPC también lo
      // impide por su lado; aquí se evita además el viaje al servidor.
      if (esPeriodoEnCurso(anio, mes)) {
        const { error: errorRpc } = await supabase.rpc('inicializar_seguimiento_mes', {
          p_anio: anio,
          p_mes: mes,
        })
        if (errorRpc) {
          if (sigueVigente(anio, mes)) set({ cargando: false, error: errorRpc.message })
          return
        }
      }

      const { data, error } = await supabase
        .from('seguimiento_mensual')
        .select('*')
        .eq('anio', anio)
        .eq('mes', mes)

      // Si mientras tanto el usuario ya se movió a otro mes, esta respuesta
      // quedó vieja: descartarla en vez de pisar la que sí corresponde.
      if (!sigueVigente(anio, mes)) return

      if (error) {
        set({ cargando: false, error: error.message })
        return
      }

      set({ registros: data ?? [], cargando: false })
    },

    cargarHistorial: async () => {
      set({ cargandoHistorial: true })

      const actual = periodoActual()
      const desde = desplazarPeriodo(actual.anio, actual.mes, -MAX_MESES_RACHA)

      // Se filtra por año en el servidor (que es lo que un índice puede
      // aprovechar) y se recorta el borde exacto aquí. Nunca se llama la RPC:
      // el historial se lee, no se siembra.
      const { data, error } = await supabase
        .from('seguimiento_mensual')
        .select('anio, mes, cumplido')
        .gte('anio', desde.anio)

      if (error) {
        set({ cargandoHistorial: false, error: error.message })
        return
      }

      const historial = (data ?? []).filter(
        (fila) =>
          compararPeriodos(fila, desde) >= 0 && compararPeriodos(fila, actual) <= 0,
      )

      set({ historial, cargandoHistorial: false })
    },

    actualizar: (id, cambios) => {
      set((estado) => ({
        registros: estado.registros.map((registro) =>
          registro.id === id ? { ...registro, ...cambios } : registro,
        ),
      }))

      cambiosPendientes.set(id, { ...cambiosPendientes.get(id), ...cambios })
      set((estado) => ({ guardando: new Set(estado.guardando).add(id) }))
      debounceRegistros.programar(id, () => void guardar(id))
    },
  }
})
