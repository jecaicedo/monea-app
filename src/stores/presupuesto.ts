import { create } from 'zustand'

import { crearDebouncePorClave } from '@/lib/debounce'
import { normalizarAMensual } from '@/lib/finanzas'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/auth'
import type { Bolsillo, Categoria, CategoriaSlug, Concepto } from '@/types/basedatos'

/**
 * Store de Presupuesto: las 6 categorías (catálogo), los bolsillos del
 * usuario y sus conceptos. Alimenta el editor por categorías de la
 * sub-pestaña "Actualiza" (debajo de Ingresos).
 *
 * Mismo patrón de autosave que src/stores/ingresos.ts: cada cambio se aplica
 * de inmediato al estado local y se persiste en Supabase tras un debounce de
 * 700ms por fila, acumulando los cambios de una misma fila si llegan varios
 * antes de que dispare.
 */

const ESPERA_AUTOGUARDADO_MS = 700

const debounceBolsillos = crearDebouncePorClave(ESPERA_AUTOGUARDADO_MS)
const debounceConceptos = crearDebouncePorClave(ESPERA_AUTOGUARDADO_MS)

const cambiosPendientesBolsillo = new Map<string, CamposEditablesBolsillo>()
const cambiosPendientesConcepto = new Map<string, CamposEditablesConcepto>()

/** Nombre y banco de un bolsillo: editables desde el presupuesto y desde Bolsillos (mismo registro). */
export type CamposEditablesBolsillo = Partial<Pick<Bolsillo, 'nombre' | 'banco'>>

export type CamposEditablesConcepto = Partial<Pick<Concepto, 'nombre' | 'monto' | 'frecuencia'>>

interface EstadoPresupuesto {
  categorias: Categoria[]
  bolsillos: Bolsillo[]
  /** Conceptos del usuario, agrupados por el id del bolsillo al que pertenecen. */
  conceptosPorBolsillo: Record<string, Concepto[]>
  cargando: boolean
  error: string | null
  /** Ids (de bolsillos o de conceptos) con un guardado pendiente o en curso. */
  guardando: Set<string>
  /** Ids de bolsillos con la tarjeta EXPANDIDA (acordeón). Vacío = todo contraído. */
  idsAbiertos: Set<string>

  cargar: () => Promise<void>
  crearBolsillo: (categoriaId: string, nombre: string, banco?: string | null) => Promise<void>
  actualizarBolsillo: (id: string, cambios: CamposEditablesBolsillo) => void
  crearConcepto: (bolsilloId: string) => Promise<void>
  actualizarConcepto: (id: string, cambios: CamposEditablesConcepto) => void
  eliminarConcepto: (id: string) => Promise<void>
  /** Expande o contrae la tarjeta de un bolsillo. Cada una es independiente. */
  alternarBolsilloAbierto: (id: string) => void
}

export const usePresupuesto = create<EstadoPresupuesto>()((set, get) => {
  async function guardarBolsillo(id: string) {
    const cambios = cambiosPendientesBolsillo.get(id)
    cambiosPendientesBolsillo.delete(id)
    if (!cambios) return

    const { error } = await supabase.from('bolsillos').update(cambios).eq('id', id)

    set((estado) => {
      const guardando = new Set(estado.guardando)
      guardando.delete(id)
      return { guardando, error: error ? error.message : estado.error }
    })
  }

  async function guardarConcepto(id: string) {
    const cambios = cambiosPendientesConcepto.get(id)
    cambiosPendientesConcepto.delete(id)
    if (!cambios) return

    const { error } = await supabase.from('conceptos').update(cambios).eq('id', id)

    set((estado) => {
      const guardando = new Set(estado.guardando)
      guardando.delete(id)
      return { guardando, error: error ? error.message : estado.error }
    })
  }

  return {
    categorias: [],
    bolsillos: [],
    conceptosPorBolsillo: {},
    cargando: true,
    error: null,
    guardando: new Set(),
    // Vacío a propósito: los bolsillos ya existentes cargan CONTRAÍDOS.
    idsAbiertos: new Set(),

    cargar: async () => {
      set({ cargando: true, error: null })

      const [
        { data: categorias, error: errorCategorias },
        { data: bolsillos, error: errorBolsillos },
        { data: conceptos, error: errorConceptos },
      ] = await Promise.all([
        supabase.from('categorias').select('*').order('orden'),
        supabase.from('bolsillos').select('*').order('orden'),
        supabase.from('conceptos').select('*').order('orden'),
      ])

      const primerError = errorCategorias ?? errorBolsillos ?? errorConceptos
      if (primerError) {
        set({ cargando: false, error: primerError.message })
        return
      }

      const conceptosPorBolsillo: Record<string, Concepto[]> = {}
      for (const concepto of conceptos ?? []) {
        ;(conceptosPorBolsillo[concepto.bolsillo_id] ??= []).push(concepto)
      }

      set({
        categorias: categorias ?? [],
        bolsillos: bolsillos ?? [],
        conceptosPorBolsillo,
        cargando: false,
      })
    },

    crearBolsillo: async (categoriaId, nombre, banco = null) => {
      const usuarioId = useAuth.getState().usuario?.id
      if (!usuarioId) return

      const orden = get().bolsillos.filter((b) => b.categoria_id === categoriaId).length

      const { data, error } = await supabase
        .from('bolsillos')
        .insert({ user_id: usuarioId, categoria_id: categoriaId, nombre, banco, orden })
        .select()
        .single()

      if (error || !data) {
        set({ error: error?.message ?? 'No se pudo crear el bolsillo.' })
        return
      }

      // Nace ABIERTO, igual que un ingreso nuevo: el usuario lo llena de una vez.
      set((estado) => ({
        bolsillos: [...estado.bolsillos, data],
        idsAbiertos: new Set(estado.idsAbiertos).add(data.id),
      }))
    },

    actualizarBolsillo: (id, cambios) => {
      set((estado) => ({
        bolsillos: estado.bolsillos.map((b) => (b.id === id ? { ...b, ...cambios } : b)),
      }))

      cambiosPendientesBolsillo.set(id, { ...cambiosPendientesBolsillo.get(id), ...cambios })
      set((estado) => ({ guardando: new Set(estado.guardando).add(id) }))
      debounceBolsillos.programar(id, () => void guardarBolsillo(id))
    },

    crearConcepto: async (bolsilloId) => {
      const usuarioId = useAuth.getState().usuario?.id
      if (!usuarioId) return

      const orden = (get().conceptosPorBolsillo[bolsilloId] ?? []).length

      const { data, error } = await supabase
        .from('conceptos')
        .insert({ user_id: usuarioId, bolsillo_id: bolsilloId, nombre: 'Nuevo concepto', orden })
        .select()
        .single()

      if (error || !data) {
        set({ error: error?.message ?? 'No se pudo crear el concepto.' })
        return
      }

      set((estado) => ({
        conceptosPorBolsillo: {
          ...estado.conceptosPorBolsillo,
          [bolsilloId]: [...(estado.conceptosPorBolsillo[bolsilloId] ?? []), data],
        },
      }))
    },

    actualizarConcepto: (id, cambios) => {
      set((estado) => {
        const conceptosPorBolsillo = { ...estado.conceptosPorBolsillo }
        for (const bolsilloId of Object.keys(conceptosPorBolsillo)) {
          conceptosPorBolsillo[bolsilloId] = conceptosPorBolsillo[bolsilloId].map((concepto) =>
            concepto.id === id ? { ...concepto, ...cambios } : concepto,
          )
        }
        return { conceptosPorBolsillo }
      })

      cambiosPendientesConcepto.set(id, { ...cambiosPendientesConcepto.get(id), ...cambios })
      set((estado) => ({ guardando: new Set(estado.guardando).add(id) }))
      debounceConceptos.programar(id, () => void guardarConcepto(id))
    },

    eliminarConcepto: async (id) => {
      debounceConceptos.cancelar(id)
      cambiosPendientesConcepto.delete(id)

      set((estado) => {
        const conceptosPorBolsillo = { ...estado.conceptosPorBolsillo }
        for (const bolsilloId of Object.keys(conceptosPorBolsillo)) {
          conceptosPorBolsillo[bolsilloId] = conceptosPorBolsillo[bolsilloId].filter(
            (concepto) => concepto.id !== id,
          )
        }
        return { conceptosPorBolsillo }
      })

      const { error } = await supabase.from('conceptos').delete().eq('id', id)
      if (error) {
        set({ error: error.message })
        void get().cargar()
      }
    },

    alternarBolsilloAbierto: (id) => {
      set((estado) => {
        const idsAbiertos = new Set(estado.idsAbiertos)
        if (idsAbiertos.has(id)) idsAbiertos.delete(id)
        else idsAbiertos.add(id)
        return { idsAbiertos }
      })
    },
  }
})

/* -------------------------------------------------------------------------- */
/* Totales — funciones puras, reutilizables sin depender del store            */
/* -------------------------------------------------------------------------- */

/** Suma los conceptos de un bolsillo, cada uno normalizado a mensual. */
export function calcularTotalBolsillo(conceptos: Concepto[]): number {
  return conceptos.reduce((suma, concepto) => suma + normalizarAMensual(concepto.monto, concepto.frecuencia), 0)
}

/** Suma el total mensual de todos los bolsillos de una categoría. */
export function calcularTotalCategoria(
  categoriaId: string,
  bolsillos: Bolsillo[],
  conceptosPorBolsillo: Record<string, Concepto[]>,
): number {
  return bolsillos
    .filter((bolsillo) => bolsillo.categoria_id === categoriaId)
    .reduce((suma, bolsillo) => suma + calcularTotalBolsillo(conceptosPorBolsillo[bolsillo.id] ?? []), 0)
}

/** El total mensual de cada categoría, indexado por su id. */
export function calcularTotalesPorCategoria(
  categorias: Categoria[],
  bolsillos: Bolsillo[],
  conceptosPorBolsillo: Record<string, Concepto[]>,
): Record<string, number> {
  const totales: Record<string, number> = {}
  for (const categoria of categorias) {
    totales[categoria.id] = calcularTotalCategoria(categoria.id, bolsillos, conceptosPorBolsillo)
  }
  return totales
}

const SLUG_AHORRO: CategoriaSlug = 'ahorro-con-proposito'

/** AHORRO de la barra de resumen: el total de la categoría "Ahorro con propósito". */
export function calcularTotalAhorro(
  categorias: Categoria[],
  bolsillos: Bolsillo[],
  conceptosPorBolsillo: Record<string, Concepto[]>,
): number {
  const categoriaAhorro = categorias.find((categoria) => categoria.slug === SLUG_AHORRO)
  if (!categoriaAhorro) return 0
  return calcularTotalCategoria(categoriaAhorro.id, bolsillos, conceptosPorBolsillo)
}

/** GASTOS de la barra de resumen: la suma de las otras 5 categorías (todas menos Ahorro). */
export function calcularTotalGastos(
  categorias: Categoria[],
  bolsillos: Bolsillo[],
  conceptosPorBolsillo: Record<string, Concepto[]>,
): number {
  return categorias
    .filter((categoria) => categoria.slug !== SLUG_AHORRO)
    .reduce((suma, categoria) => suma + calcularTotalCategoria(categoria.id, bolsillos, conceptosPorBolsillo), 0)
}
