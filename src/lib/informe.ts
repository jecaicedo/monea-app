import type { User } from '@supabase/supabase-js'

import { calcularEstadoPresupuesto, calcularGastosFijos, calcularHolguraCategoria } from '@/lib/diagnostico'
import type { EstadoPresupuesto, TipoHolgura } from '@/lib/diagnostico'
import { netoIngreso, normalizarAMensual } from '@/lib/finanzas'
import { fechaISOHoy, formatearFecha } from '@/lib/formato'
import { calcularEnPositivo, calcularFondoLogrado, estaMetaLograda } from '@/lib/metas'
import { calcularEstadoProximidad, calcularProximaOcurrencia, formatearFechaRecordatorio } from '@/lib/recordatorios'
import { calcularTotalIngresosNetos } from '@/stores/ingresos'
import { calcularTotalAhorro, calcularTotalBolsillo, calcularTotalCategoria, calcularTotalGastos } from '@/stores/presupuesto'
import type {
  Bolsillo,
  Categoria,
  DeduccionPersonalizada,
  Ingreso,
  Meta,
  Recordatorio,
  TipoRecordatorio,
} from '@/types/basedatos'
import type { Concepto } from '@/types/basedatos'

/**
 * Armado de los datos del informe PDF: una función PURA que no dibuja nada
 * (no importa jsPDF). Recibe una foto de los stores ya cargados y reutiliza
 * exactamente las mismas funciones de cálculo que el resto de la app —
 * `stores/presupuesto.ts`, `stores/ingresos.ts`, `lib/diagnostico.ts`,
 * `lib/metas.ts`, `lib/recordatorios.ts` — para que el PDF nunca pueda mostrar
 * un número distinto al que ve el usuario en pantalla.
 *
 * Como `excedente = ingresos − gastos − ahorro` por definición, la cuadratura
 * "gastos + ahorro + excedente = ingresos" se cumple siempre por construcción.
 */

export interface DatosInformeEntrada {
  usuario: User | null
  ingresos: Ingreso[]
  deducciones: Record<string, DeduccionPersonalizada[]>
  categorias: Categoria[]
  bolsillos: Bolsillo[]
  conceptosPorBolsillo: Record<string, Concepto[]>
  metas: Meta[]
  recordatorios: Recordatorio[]
}

export interface DatosInformeCategoria {
  nombre: string
  color: string
  porcentajeIdeal: number
  montoMensual: number
  porcentajeReal: number
  diferencia: number
  tipoHolgura: TipoHolgura
}

export interface DatosInformePlanConcepto {
  nombre: string
  monto: number
}

export interface DatosInformePlanBolsillo {
  nombre: string
  subtotal: number
  conceptos: DatosInformePlanConcepto[]
}

export interface DatosInformePlanCategoria {
  categoria: string
  color: string
  subtotal: number
  bolsillos: DatosInformePlanBolsillo[]
}

export interface DatosInformeDeuda {
  concepto: string
  cuotaMensual: number
}

export type DatosInformeDistribucion =
  | { tipo: 'sin_ingresos' }
  | { tipo: 'unica'; nombreIngreso: string; neto: number }
  | { tipo: 'multiple'; ingresos: { nombre: string; neto: number }[] }

export interface DatosInformeMetaPropia {
  nombre: string
  objetivo: number
  actual: number
  porcentaje: number
  logrado: boolean
}

export interface DatosInformeMetas {
  enPositivo: boolean
  excedente: number
  fondo: {
    nombre: string
    objetivo: number
    actual: number
    porcentaje: number
    logrado: boolean
    banco: string | null
  } | null
  propias: DatosInformeMetaPropia[]
  logros: { nombre: string; fecha: string | null }[]
}

export interface DatosInformeRecordatorio {
  tipoEtiqueta: string
  titulo: string
  fechaTexto: string
  estado: 'vencido' | 'proximo'
}

export interface DatosInforme {
  nombreUsuario: string
  fechaGeneracion: string
  resumen: {
    totalIngresos: number
    totalGastos: number
    totalAhorro: number
    excedenteMensual: number
    excedenteAnual: number
    estado: EstadoPresupuesto
    etiquetaEstado: string
  }
  usoIngresos: {
    porcentajeGastos: number
    porcentajeAhorro: number
    porcentajeExcedente: number
  }
  categorias: DatosInformeCategoria[]
  gastosFijos: { monto: number; porcentaje: number }
  plan: DatosInformePlanCategoria[]
  deudas: DatosInformeDeuda[]
  distribucion: DatosInformeDistribucion
  metas: DatosInformeMetas
  recordatoriosProximos: DatosInformeRecordatorio[]
}

const SLUG_DEUDAS = 'deudas'

// Espejo corto de components/recordatorios/tiposRecordatorio.tsx: se duplica
// aquí (solo las 5 etiquetas) para no hacer que este módulo de datos puros
// dependa de un archivo de componentes.
const ETIQUETAS_TIPO_RECORDATORIO: Record<TipoRecordatorio, string> = {
  pago: 'Pago',
  tarjeta: 'Tarjeta',
  cumpleanos: 'Cumpleaños',
  pico_y_placa: 'Pico y placa',
  otro: 'Otro',
}

/** Neto mensual de UN ingreso — misma fórmula que usa calcularTotalIngresosNetos, aplicada a un solo ítem. */
function netoMensualDe(ingreso: Ingreso, deducciones: Record<string, DeduccionPersonalizada[]>): number {
  const montos = (deducciones[ingreso.id] ?? []).map((d) => d.monto)
  return normalizarAMensual(netoIngreso(ingreso, montos), ingreso.frecuencia)
}

export function armarDatosInforme(entrada: DatosInformeEntrada): DatosInforme {
  const { usuario, ingresos, deducciones, categorias, bolsillos, conceptosPorBolsillo, metas, recordatorios } = entrada

  const nombreUsuario =
    (usuario?.user_metadata?.nombre as string | undefined)?.trim() || usuario?.email || 'Usuario de Monea'

  const totalIngresos = calcularTotalIngresosNetos(ingresos, deducciones)
  const totalGastos = calcularTotalGastos(categorias, bolsillos, conceptosPorBolsillo)
  const totalAhorro = calcularTotalAhorro(categorias, bolsillos, conceptosPorBolsillo)
  const excedenteMensual = totalIngresos - totalGastos - totalAhorro
  const { tipo: estadoTipo, etiqueta: etiquetaEstado } = calcularEstadoPresupuesto(excedenteMensual, totalAhorro)

  const usoIngresos = {
    porcentajeGastos: totalIngresos > 0 ? totalGastos / totalIngresos : 0,
    porcentajeAhorro: totalIngresos > 0 ? totalAhorro / totalIngresos : 0,
    porcentajeExcedente: totalIngresos > 0 ? excedenteMensual / totalIngresos : 0,
  }

  const datosCategorias: DatosInformeCategoria[] = categorias.map((categoria) => {
    const montoMensual = calcularTotalCategoria(categoria.id, bolsillos, conceptosPorBolsillo)
    const holgura = calcularHolguraCategoria(categoria, montoMensual, totalIngresos)
    return {
      nombre: categoria.nombre,
      color: categoria.color,
      porcentajeIdeal: categoria.porcentaje_ideal,
      montoMensual,
      porcentajeReal: totalIngresos > 0 ? montoMensual / totalIngresos : 0,
      diferencia: holgura.diferencia,
      tipoHolgura: holgura.tipo,
    }
  })

  const montoGastosFijos = calcularGastosFijos(categorias, bolsillos, conceptosPorBolsillo)

  // "Tu plan, línea por línea": categoría -> bolsillos -> conceptos > $0. Se
  // omiten bolsillos sin ningún concepto con monto (nada que mostrar).
  const plan: DatosInformePlanCategoria[] = categorias
    .map((categoria) => {
      const bolsillosDeCategoria = bolsillos.filter((b) => b.categoria_id === categoria.id)
      const datosBolsillos: DatosInformePlanBolsillo[] = bolsillosDeCategoria
        .map((bolsillo) => {
          const conceptos = conceptosPorBolsillo[bolsillo.id] ?? []
          const subtotal = calcularTotalBolsillo(conceptos)
          const conceptosConMonto = conceptos
            .map((c) => ({ nombre: c.nombre, monto: normalizarAMensual(c.monto, c.frecuencia) }))
            .filter((c) => c.monto > 0)
          return { nombre: bolsillo.nombre, subtotal, conceptos: conceptosConMonto }
        })
        .filter((b) => b.subtotal > 0)

      return {
        categoria: categoria.nombre,
        color: categoria.color,
        subtotal: calcularTotalCategoria(categoria.id, bolsillos, conceptosPorBolsillo),
        bolsillos: datosBolsillos,
      }
    })
    .filter((c) => c.bolsillos.length > 0)

  // Deudas: sección aparte con las líneas de la categoría 'deudas'. Saldo,
  // tasa E.A. y n.º de cuotas no existen todavía en el modelo de datos — se
  // muestran como "—" en el dibujo del PDF, nunca inventados aquí.
  const categoriaDeudas = categorias.find((c) => c.slug === SLUG_DEUDAS)
  const deudas: DatosInformeDeuda[] = categoriaDeudas
    ? bolsillos
        .filter((b) => b.categoria_id === categoriaDeudas.id)
        .flatMap((bolsillo) => conceptosPorBolsillo[bolsillo.id] ?? [])
        .map((concepto) => ({ concepto: concepto.nombre, cuotaMensual: normalizarAMensual(concepto.monto, concepto.frecuencia) }))
        .filter((d) => d.cuotaMensual > 0)
    : []

  // Distribución por ingreso: la función "Distribuir" todavía no existe, así
  // que no se genera una tabla de "sin asignar". Con un solo ingreso, una
  // frase; con varios, la lista de netos y una nota de que vendrá después.
  let distribucion: DatosInformeDistribucion
  if (ingresos.length === 0) {
    distribucion = { tipo: 'sin_ingresos' }
  } else if (ingresos.length === 1) {
    distribucion = { tipo: 'unica', nombreIngreso: ingresos[0].nombre, neto: netoMensualDe(ingresos[0], deducciones) }
  } else {
    distribucion = {
      tipo: 'multiple',
      ingresos: ingresos.map((ingreso) => ({ nombre: ingreso.nombre, neto: netoMensualDe(ingreso, deducciones) })),
    }
  }

  const metaFondo = metas.find((m) => m.tipo === 'fondo_emergencia')
  const metasPropias = metas.filter((m) => m.tipo === 'meta')
  const enPositivo = calcularEnPositivo(excedenteMensual)
  const fondoLogrado = calcularFondoLogrado(metaFondo, enPositivo)

  const datosMetas: DatosInformeMetas = {
    enPositivo,
    excedente: excedenteMensual,
    fondo: metaFondo
      ? {
          nombre: metaFondo.nombre,
          objetivo: metaFondo.monto_objetivo,
          actual: metaFondo.monto_actual,
          porcentaje: metaFondo.monto_objetivo > 0 ? metaFondo.monto_actual / metaFondo.monto_objetivo : 0,
          logrado: fondoLogrado,
          banco: metaFondo.banco,
        }
      : null,
    propias: metasPropias.map((meta) => ({
      nombre: meta.nombre,
      objetivo: meta.monto_objetivo,
      actual: meta.monto_actual,
      porcentaje: meta.monto_objetivo > 0 ? meta.monto_actual / meta.monto_objetivo : 0,
      logrado: estaMetaLograda(meta),
    })),
    logros: [
      ...(fondoLogrado && metaFondo ? [{ nombre: metaFondo.nombre, fecha: metaFondo.fecha_lograda }] : []),
      ...metasPropias.filter(estaMetaLograda).map((meta) => ({ nombre: meta.nombre, fecha: meta.fecha_lograda })),
    ],
  }

  // Recordatorios próximos (opcional): solo vencidos o dentro de los próximos
  // 7 días, ordenados por cercanía. Si no hay ninguno, la sección se omite
  // por completo al dibujar el PDF.
  const recordatoriosProximos: DatosInformeRecordatorio[] = recordatorios
    .map((recordatorio) => {
      const { fecha, diasHasta } = calcularProximaOcurrencia(recordatorio.fecha, recordatorio.recurrencia)
      return { recordatorio, fecha, diasHasta, estado: calcularEstadoProximidad(diasHasta) }
    })
    .filter((r): r is typeof r & { estado: 'vencido' | 'proximo' } => r.estado !== 'mas_adelante')
    .sort((a, b) => a.diasHasta - b.diasHasta)
    .map((r) => ({
      tipoEtiqueta: ETIQUETAS_TIPO_RECORDATORIO[r.recordatorio.tipo],
      titulo: r.recordatorio.titulo,
      fechaTexto: formatearFechaRecordatorio(r.fecha, r.diasHasta),
      estado: r.estado,
    }))

  return {
    nombreUsuario,
    fechaGeneracion: formatearFecha(new Date().toISOString()),
    resumen: {
      totalIngresos,
      totalGastos,
      totalAhorro,
      excedenteMensual,
      excedenteAnual: excedenteMensual * 12,
      estado: estadoTipo,
      etiquetaEstado,
    },
    usoIngresos,
    categorias: datosCategorias,
    gastosFijos: {
      monto: montoGastosFijos,
      porcentaje: totalIngresos > 0 ? montoGastosFijos / totalIngresos : 0,
    },
    plan,
    deudas,
    distribucion,
    metas: datosMetas,
    recordatoriosProximos,
  }
}

/** "Juan Pérez" -> "juan-perez", para un nombre de archivo limpio. */
export function normalizarParaArchivo(texto: string): string {
  const SIN_TILDES = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g')
  const limpio = texto
    .normalize('NFD')
    .replace(SIN_TILDES, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
  return limpio || 'usuario'
}

/** Nombre de archivo sugerido para la descarga: "Monea-informe-{nombre}-{fecha}.pdf". */
export function nombreArchivoInforme(nombreUsuario: string): string {
  return `Monea-informe-${normalizarParaArchivo(nombreUsuario)}-${fechaISOHoy()}.pdf`
}

// MEJORA FUTURA: para una columna "Antes / Después" real (como en informes de
// otras herramientas) haría falta guardar un snapshot inicial del presupuesto
// del usuario (su primera versión) y compararlo contra el estado actual. Hoy
// ese snapshot no existe, así que este informe muestra únicamente el estado
// ACTUAL, en una sola columna.
