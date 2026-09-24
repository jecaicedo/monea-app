import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CellHookData } from 'jspdf-autotable'

import { nombreArchivoInforme } from '@/lib/informe'
import type { DatosInforme } from '@/lib/informe'
import { formatearCOP, formatearFecha, formatearPorcentaje } from '@/lib/formato'

/**
 * Dibuja el informe en PDF a partir de `DatosInforme` (ya calculado por
 * `lib/informe.ts`). Este módulo SOLO dibuja: ni un cálculo propio.
 *
 * Todo el texto se traza con las funciones vectoriales nativas de jsPDF
 * (`doc.text`, `autoTable`) — nunca `doc.html()` (que rasteriza con
 * html2canvas), así que el texto siempre queda nítido y seleccionable.
 */

type ColorRGB = readonly [number, number, number]

// jsPDF no puede leer variables CSS: estos son los mismos valores de
// theme.css → [data-theme='claro'] (se usa siempre la paleta clara, el PDF se
// lee/imprime sobre blanco sin importar el tema de la app), aplanados a RGB
// sólido donde el original usaba transparencia. Segunda excepción sancionada
// a "nunca colores literales" en la app, junto al color de categoría.
const COLOR = {
  surface2: [237, 240, 243],
  accent: [14, 116, 144],
  accentFill: [34, 211, 238],
  onAccent: [6, 39, 48],
  accentSoft: [206, 245, 251],
  positive: [4, 120, 87],
  positiveFill: [52, 211, 153],
  positiveSoft: [223, 248, 239],
  danger: [220, 38, 38],
  dangerFill: [242, 109, 109],
  dangerSoft: [253, 237, 237],
  text: [20, 23, 26],
  muted: [90, 98, 108],
  border: [230, 230, 230],
} satisfies Record<string, ColorRGB>

const MARGEN = 16
const ANCHO_PAGINA = 210
const ALTO_PAGINA = 297
const ANCHO_CONTENIDO = ANCHO_PAGINA - MARGEN * 2
const INICIO_CONTENIDO = 30
const FIN_CONTENIDO = ALTO_PAGINA - MARGEN - 14
// Reservan el espacio del encabezado delgado / pie en las tablas de autoTable.
const MARGEN_TABLA = { top: INICIO_CONTENIDO, bottom: 24, left: MARGEN, right: MARGEN }

/** "#22D3EE" -> [34, 211, 238] */
function hexARgb(hex: string): ColorRGB {
  const limpio = hex.replace('#', '')
  const numero = parseInt(limpio, 16)
  return [(numero >> 16) & 255, (numero >> 8) & 255, numero & 255]
}

export function generarInformePdf(datos: DatosInforme): { doc: jsPDF; blob: Blob; nombreArchivo: string } {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGEN

  /** Añade página si el siguiente bloque no cabe antes del pie. */
  function saltoDePaginaSiNecesita(alturaNecesaria: number) {
    if (y + alturaNecesaria > FIN_CONTENIDO) {
      doc.addPage()
      y = INICIO_CONTENIDO
    }
  }

  function dibujarTituloSeccion(titulo: string) {
    saltoDePaginaSiNecesita(16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...COLOR.text)
    doc.text(titulo, MARGEN, y)
    y += 3
    doc.setDrawColor(...COLOR.accentFill)
    doc.setLineWidth(0.6)
    doc.line(MARGEN, y, MARGEN + 22, y)
    y += 8
  }

  function actualizarCursorTrasTabla() {
    // jspdf-autotable escribe `lastAutoTable` directo en la instancia de jsPDF.
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
    y = (finalY ?? y) + 6
  }

  /* ------------------------------------------------------------------ */
  /* 1. Portada                                                          */
  /* ------------------------------------------------------------------ */
  function dibujarPortada() {
    doc.setFillColor(...COLOR.accentFill)
    doc.rect(0, 0, ANCHO_PAGINA, 54, 'F')
    doc.setTextColor(...COLOR.onAccent)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(24)
    doc.text('Monea', MARGEN, 26)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(13)
    doc.text('Informe financiero personal', MARGEN, 38)

    y = 70
    doc.setTextColor(...COLOR.text)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(datos.nombreUsuario, MARGEN, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...COLOR.muted)
    doc.text(`Generado el ${datos.fechaGeneracion}`, MARGEN, y)
    y += 14

    doc.setTextColor(...COLOR.text)
    doc.setFontSize(10)
    const introduccion = doc.splitTextToSize(
      'Este informe reúne, en un solo documento, cómo está tu presupuesto hoy: cuánto entra, cuánto sale, ' +
        'en qué se va cada peso y qué tan cerca estás de tus metas. Los números salen directo de tu presupuesto en Monea.',
      ANCHO_CONTENIDO,
    )
    doc.text(introduccion, MARGEN, y)
    y += introduccion.length * 5 + 10
  }

  /* ------------------------------------------------------------------ */
  /* 2. Resumen general                                                  */
  /* ------------------------------------------------------------------ */
  function dibujarResumenGeneral() {
    dibujarTituloSeccion('Resumen general')

    const cajas: { etiqueta: string; valor: number; color: ColorRGB }[] = [
      { etiqueta: 'Ingresos', valor: datos.resumen.totalIngresos, color: COLOR.text },
      { etiqueta: 'Gastos', valor: datos.resumen.totalGastos, color: COLOR.text },
      { etiqueta: 'Ahorro', valor: datos.resumen.totalAhorro, color: COLOR.positive },
      {
        etiqueta: 'Te sobra',
        valor: datos.resumen.excedenteMensual,
        color: datos.resumen.excedenteMensual >= 0 ? COLOR.positive : COLOR.danger,
      },
    ]
    const anchoCaja = (ANCHO_CONTENIDO - 3 * 4) / 4
    const altoCaja = 22
    saltoDePaginaSiNecesita(altoCaja + 4)

    cajas.forEach((caja, indice) => {
      const x = MARGEN + indice * (anchoCaja + 4)
      doc.setFillColor(...COLOR.surface2)
      doc.roundedRect(x, y, anchoCaja, altoCaja, 2, 2, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...COLOR.muted)
      doc.text(caja.etiqueta, x + 3, y + 7)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(...caja.color)
      doc.text(formatearCOP(caja.valor), x + 3, y + 16)
    })
    y += altoCaja + 8

    const colorEstado =
      datos.resumen.estado === 'deficit' ? COLOR.danger : datos.resumen.estado === 'superavit' ? COLOR.positive : COLOR.accent
    const colorEstadoSuave =
      datos.resumen.estado === 'deficit'
        ? COLOR.dangerSoft
        : datos.resumen.estado === 'superavit'
          ? COLOR.positiveSoft
          : COLOR.accentSoft

    saltoDePaginaSiNecesita(20)
    doc.setFillColor(...colorEstadoSuave)
    doc.roundedRect(MARGEN, y, ANCHO_CONTENIDO, 16, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...colorEstado)
    doc.text(datos.resumen.etiquetaEstado, MARGEN + 4, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(
      `Te sobran ${formatearCOP(datos.resumen.excedenteMensual)} al mes · ${formatearCOP(datos.resumen.excedenteAnual)} al año`,
      MARGEN + 4,
      y + 13,
    )
    y += 16 + 10
  }

  /* ------------------------------------------------------------------ */
  /* 3. Cómo usa sus ingresos                                            */
  /* ------------------------------------------------------------------ */
  function dibujarUsoIngresos() {
    dibujarTituloSeccion('Cómo usa sus ingresos')

    const { porcentajeGastos, porcentajeAhorro, porcentajeExcedente } = datos.usoIngresos
    saltoDePaginaSiNecesita(28)

    const altoBarra = 8
    // Si hay déficit, gastos + ahorro puede superar el 100%: se escala la
    // barra visualmente sin tocar las cifras reales de la leyenda.
    const totalVisual = Math.max(porcentajeGastos + porcentajeAhorro + Math.max(porcentajeExcedente, 0), 1)
    const anchoGastos = (Math.max(porcentajeGastos, 0) / totalVisual) * ANCHO_CONTENIDO
    const anchoAhorro = (Math.max(porcentajeAhorro, 0) / totalVisual) * ANCHO_CONTENIDO
    const anchoExcedente = (Math.max(porcentajeExcedente, 0) / totalVisual) * ANCHO_CONTENIDO

    let cursorX = MARGEN
    doc.setFillColor(...COLOR.dangerFill)
    doc.rect(cursorX, y, anchoGastos, altoBarra, 'F')
    cursorX += anchoGastos
    doc.setFillColor(...COLOR.positiveFill)
    doc.rect(cursorX, y, anchoAhorro, altoBarra, 'F')
    cursorX += anchoAhorro
    doc.setFillColor(...COLOR.accentFill)
    doc.rect(cursorX, y, anchoExcedente, altoBarra, 'F')
    y += altoBarra + 6

    const filas: [string, number, number][] = [
      ['Gastos', datos.resumen.totalGastos, porcentajeGastos],
      ['Ahorro', datos.resumen.totalAhorro, porcentajeAhorro],
      ['Te sobra', datos.resumen.excedenteMensual, porcentajeExcedente],
    ]
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLOR.text)
    filas.forEach(([etiqueta, monto, porcentaje], indice) => {
      doc.text(`${etiqueta}: ${formatearCOP(monto)} (${formatearPorcentaje(porcentaje)})`, MARGEN, y + indice * 5.5)
    })
    y += filas.length * 5.5 + 8
  }

  /* ------------------------------------------------------------------ */
  /* 4. Detalle por categoría                                            */
  /* ------------------------------------------------------------------ */
  function dibujarDetallePorCategoria() {
    dibujarTituloSeccion('Detalle por categoría')

    autoTable(doc, {
      startY: y,
      margin: MARGEN_TABLA,
      head: [['Categoría', 'Ideal', 'Monto / mes', '% real', 'Holgura']],
      body: datos.categorias.map((categoria) => [
        categoria.nombre,
        formatearPorcentaje(categoria.porcentajeIdeal / 100),
        formatearCOP(categoria.montoMensual),
        formatearPorcentaje(categoria.porcentajeReal),
        `${categoria.diferencia >= 0 ? '+' : ''}${formatearCOP(categoria.diferencia)}`,
      ]),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, textColor: [...COLOR.text], lineColor: [...COLOR.border], lineWidth: 0.2 },
      headStyles: { fillColor: [...COLOR.surface2], textColor: [...COLOR.text], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 48 },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'center' },
        4: { halign: 'right' },
      },
      didParseCell: (dato: CellHookData) => {
        if (dato.section !== 'body') return
        const fila = datos.categorias[dato.row.index]
        if (fila?.tipoHolgura === 'exceso') {
          dato.cell.styles.fillColor = [...COLOR.dangerSoft]
          if (dato.column.index === 4) dato.cell.styles.textColor = [...COLOR.danger]
        }
      },
    })
    actualizarCursorTrasTabla()

    saltoDePaginaSiNecesita(14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.muted)
    const notaFijos = doc.splitTextToSize(
      `Gastos fijos (Hogar + Necesidades básicas): ${formatearCOP(datos.gastosFijos.monto)} · ` +
        `${formatearPorcentaje(datos.gastosFijos.porcentaje)} de tus ingresos (ideal 50–60%).`,
      ANCHO_CONTENIDO,
    )
    doc.text(notaFijos, MARGEN, y)
    y += notaFijos.length * 5 + 8
  }

  /* ------------------------------------------------------------------ */
  /* 5. Tu plan, línea por línea                                         */
  /* ------------------------------------------------------------------ */
  function dibujarPlan() {
    dibujarTituloSeccion('Tu plan, línea por línea')

    for (const categoria of datos.plan) {
      saltoDePaginaSiNecesita(12)
      doc.setFillColor(...hexARgb(categoria.color))
      doc.circle(MARGEN + 1, y - 1.4, 1.1, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(...COLOR.text)
      doc.text(categoria.categoria, MARGEN + 5, y)
      doc.text(formatearCOP(categoria.subtotal), ANCHO_PAGINA - MARGEN, y, { align: 'right' })
      y += 6

      for (const bolsillo of categoria.bolsillos) {
        saltoDePaginaSiNecesita(10)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        doc.setTextColor(...COLOR.text)
        doc.text(bolsillo.nombre, MARGEN + 8, y)
        doc.text(formatearCOP(bolsillo.subtotal), ANCHO_PAGINA - MARGEN, y, { align: 'right' })
        y += 5

        for (const concepto of bolsillo.conceptos) {
          saltoDePaginaSiNecesita(6)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(...COLOR.muted)
          doc.text(concepto.nombre, MARGEN + 12, y)
          doc.text(formatearCOP(concepto.monto), ANCHO_PAGINA - MARGEN, y, { align: 'right' })
          y += 4.8
        }
        y += 2
      }
      y += 4
    }
  }

  /* ------------------------------------------------------------------ */
  /* 6. Tus deudas                                                       */
  /* ------------------------------------------------------------------ */
  function dibujarDeudas() {
    dibujarTituloSeccion('Tus deudas')

    if (datos.deudas.length === 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(...COLOR.muted)
      doc.text('No tienes deudas registradas.', MARGEN, y)
      y += 8
      return
    }

    autoTable(doc, {
      startY: y,
      margin: MARGEN_TABLA,
      head: [['Concepto', 'Cuota al mes', 'Saldo', 'Tasa E.A.', 'N.º cuotas']],
      body: datos.deudas.map((deuda) => [deuda.concepto, formatearCOP(deuda.cuotaMensual), '—', '—', '—']),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, textColor: [...COLOR.text], lineColor: [...COLOR.border], lineWidth: 0.2 },
      headStyles: { fillColor: [...COLOR.surface2], textColor: [...COLOR.text], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
    })
    actualizarCursorTrasTabla()

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLOR.muted)
    const nota = doc.splitTextToSize(
      'Saldo, tasa E.A. y número de cuotas todavía no se registran en la app: se completarán aquí cuando ese dato exista.',
      ANCHO_CONTENIDO,
    )
    doc.text(nota, MARGEN, y)
    y += nota.length * 4.2 + 8
  }

  /* ------------------------------------------------------------------ */
  /* 7. Distribución por ingreso                                         */
  /* ------------------------------------------------------------------ */
  function dibujarDistribucion() {
    dibujarTituloSeccion('Distribución por ingreso')
    saltoDePaginaSiNecesita(16)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...COLOR.text)

    if (datos.distribucion.tipo === 'sin_ingresos') {
      doc.text('Todavía no tienes un ingreso registrado.', MARGEN, y)
      y += 8
      return
    }

    if (datos.distribucion.tipo === 'unica') {
      doc.text(
        `Todo tu plan se cubre con: ${datos.distribucion.nombreIngreso} — ${formatearCOP(datos.distribucion.neto)} al mes.`,
        MARGEN,
        y,
      )
      y += 8
      return
    }

    datos.distribucion.ingresos.forEach((ingreso) => {
      saltoDePaginaSiNecesita(6)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(...COLOR.text)
      doc.text(`•  ${ingreso.nombre} — ${formatearCOP(ingreso.neto)} al mes`, MARGEN, y)
      y += 5.5
    })
    y += 2

    saltoDePaginaSiNecesita(10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...COLOR.muted)
    const nota = doc.splitTextToSize(
      'La distribución detallada por ingreso (qué concepto se paga con cuál cuenta) estará disponible próximamente, cuando actives Distribuir.',
      ANCHO_CONTENIDO,
    )
    doc.text(nota, MARGEN, y)
    y += nota.length * 4.2 + 8
  }

  /* ------------------------------------------------------------------ */
  /* 8. Tus metas                                                        */
  /* ------------------------------------------------------------------ */
  function dibujarMetas() {
    dibujarTituloSeccion('Tus metas')
    const metas = datos.metas

    saltoDePaginaSiNecesita(8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...(metas.enPositivo ? COLOR.positive : COLOR.danger))
    doc.text(metas.enPositivo ? 'Pasar en positivo — lograda' : 'Pasar en positivo — pendiente', MARGEN, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLOR.muted)
    doc.text(`(${formatearCOP(metas.excedente)} al mes)`, ANCHO_PAGINA - MARGEN, y, { align: 'right' })
    y += 8

    if (metas.fondo) {
      saltoDePaginaSiNecesita(11)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...COLOR.text)
      doc.text(`Fondo de emergencia${metas.fondo.logrado ? ' — lograda' : ''}`, MARGEN, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLOR.muted)
      doc.text(
        `${formatearCOP(metas.fondo.actual)} de ${formatearCOP(metas.fondo.objetivo)} (${formatearPorcentaje(metas.fondo.porcentaje)})`,
        MARGEN,
        y + 5,
      )
      y += 11
    }

    if (metas.propias.length === 0) {
      saltoDePaginaSiNecesita(8)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...COLOR.muted)
      doc.text('Todavía no has creado metas propias.', MARGEN, y)
      y += 8
    } else {
      metas.propias.forEach((meta) => {
        saltoDePaginaSiNecesita(11)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        doc.setTextColor(...COLOR.text)
        doc.text(`${meta.nombre}${meta.logrado ? ' — lograda' : ''}`, MARGEN, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...COLOR.muted)
        doc.text(`${formatearCOP(meta.actual)} de ${formatearCOP(meta.objetivo)} (${formatearPorcentaje(meta.porcentaje)})`, MARGEN, y + 5)
        y += 10
      })
    }

    if (metas.logros.length > 0) {
      saltoDePaginaSiNecesita(9)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...COLOR.accent)
      doc.text('Metas logradas', MARGEN, y)
      y += 5.5
      metas.logros.forEach((logro) => {
        saltoDePaginaSiNecesita(5.5)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(...COLOR.text)
        doc.text(`•  ${logro.nombre}${logro.fecha ? ` — ${formatearFecha(logro.fecha)}` : ''}`, MARGEN, y)
        y += 5.2
      })
      y += 4
    }
  }

  /* ------------------------------------------------------------------ */
  /* 9. Recordatorios próximos (opcional)                                */
  /* ------------------------------------------------------------------ */
  function dibujarRecordatorios() {
    if (datos.recordatoriosProximos.length === 0) return

    dibujarTituloSeccion('Recordatorios próximos')
    datos.recordatoriosProximos.forEach((recordatorio) => {
      saltoDePaginaSiNecesita(6)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...(recordatorio.estado === 'vencido' ? COLOR.danger : COLOR.accent))
      doc.text(`•  [${recordatorio.tipoEtiqueta}] ${recordatorio.titulo} — ${recordatorio.fechaTexto}`, MARGEN, y)
      y += 5.2
    })
    y += 4
  }

  /* ------------------------------------------------------------------ */
  /* 10. Encabezado delgado (páginas 2+) y pie (todas)                   */
  /* ------------------------------------------------------------------ */
  function dibujarEncabezadoDelgado() {
    doc.setFillColor(...COLOR.accentSoft)
    doc.rect(0, 0, ANCHO_PAGINA, 18, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...COLOR.accent)
    doc.text('Monea', MARGEN, 11)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.muted)
    doc.text('Informe financiero personal', ANCHO_PAGINA - MARGEN, 11, { align: 'right' })
  }

  function dibujarPiePagina(numero: number, total: number) {
    const yPie = ALTO_PAGINA - 12
    doc.setDrawColor(...COLOR.border)
    doc.setLineWidth(0.2)
    doc.line(MARGEN, yPie, ANCHO_PAGINA - MARGEN, yPie)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLOR.muted)
    doc.text(`Monea · Tu plan al ${datos.fechaGeneracion}. Los números se actualizan en tu aplicación.`, MARGEN, yPie + 5)
    doc.text(`${numero} / ${total}`, ANCHO_PAGINA - MARGEN, yPie + 5, { align: 'right' })
  }

  /* ------------------------------------------------------------------ */
  /* Armado                                                              */
  /* ------------------------------------------------------------------ */
  dibujarPortada()
  dibujarResumenGeneral()
  dibujarUsoIngresos()
  dibujarDetallePorCategoria()
  dibujarPlan()
  dibujarDeudas()
  dibujarDistribucion()
  dibujarMetas()
  dibujarRecordatorios()

  // El encabezado delgado y el pie se pintan al final, en una sola pasada por
  // TODAS las páginas ya creadas (por saltoDePaginaSiNecesita o por autoTable):
  // el contenido siempre dejó ese espacio reservado (INICIO_CONTENIDO / margen
  // inferior de las tablas), así que pintar encima no tapa nada.
  const totalPaginas = doc.getNumberOfPages()
  for (let numero = 1; numero <= totalPaginas; numero++) {
    doc.setPage(numero)
    if (numero > 1) dibujarEncabezadoDelgado()
    dibujarPiePagina(numero, totalPaginas)
  }

  const blob = doc.output('blob')
  return { doc, blob, nombreArchivo: nombreArchivoInforme(datos.nombreUsuario) }
}
