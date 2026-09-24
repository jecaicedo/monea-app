import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { EncabezadoPagina } from '@/components/EncabezadoPagina'
import { Boton } from '@/components/ui/Boton'
import { IconoCargando } from '@/components/ui/iconos'
import { armarDatosInforme } from '@/lib/informe'
import { useAuth } from '@/stores/auth'
import { useIngresos } from '@/stores/ingresos'
import { useMetas } from '@/stores/metas'
import { usePresupuesto } from '@/stores/presupuesto'
import { useRecordatorios } from '@/stores/recordatorios'

/**
 * Convierte un Blob a "data:" URL en base64.
 *
 * Para la vista previa hace falta esto en vez de una "blob:" URL, porque el
 * PDF se muestra dentro de un <iframe> incrustado en la pestaña nueva (ver
 * `mostrarVistaPrevia`) y una "blob:" URL solo existe en el documento que la
 * creó, así que un <iframe> en OTRA pestaña no podría resolverla. Una "data:"
 * URL lleva el archivo codificado en la propia URL, así que funciona sin
 * importar el documento — y el informe pesa pocos KB, así que el tamaño
 * extra de la codificación base64 no es un problema.
 */
function blobADataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(lector.result as string)
    lector.onerror = () => reject(lector.error)
    lector.readAsDataURL(blob)
  })
}

/**
 * Escribe el visor de PDF dentro de la pestaña ya abierta (sincrónicamente,
 * para no chocar con bloqueadores de pop-ups).
 *
 * NO se navega la pestaña directamente a la "data:" URL (`ventana.location =
 * dataUrl`): Chrome bloquea la navegación de nivel superior a una "data:"
 * URL iniciada por script (protección anti-phishing). La solución estándar es
 * incrustar el PDF en un <iframe> dentro de un documento en blanco: ahí la
 * restricción no aplica, porque el nivel superior nunca navega.
 */
function mostrarVistaPrevia(ventana: Window, dataUrl: string, titulo: string): void {
  ventana.document.open()
  ventana.document.write(
    `<!doctype html><title>${titulo}</title>` +
      '<style>html,body,iframe{margin:0;height:100%;width:100%;border:0}</style>' +
      `<iframe src="${dataUrl}"></iframe>`,
  )
  ventana.document.close()
}

/**
 * Descargar informe: arma un PDF con el mismo estado que ve el usuario en la
 * app (ver `lib/informe.ts`) y lo dibuja con jsPDF + autotable (ver
 * `lib/generarInformePdf.ts`). La librería se importa de forma diferida
 * (dentro del handler) para no sumarla al bundle principal de la app.
 */
export default function Informe() {
  const usuario = useAuth((estado) => estado.usuario)

  const ingresos = useIngresos((estado) => estado.ingresos)
  const deducciones = useIngresos((estado) => estado.deducciones)
  const cargandoIngresos = useIngresos((estado) => estado.cargando)
  const cargarIngresos = useIngresos((estado) => estado.cargar)

  const categorias = usePresupuesto((estado) => estado.categorias)
  const bolsillos = usePresupuesto((estado) => estado.bolsillos)
  const conceptosPorBolsillo = usePresupuesto((estado) => estado.conceptosPorBolsillo)
  const cargandoPresupuesto = usePresupuesto((estado) => estado.cargando)
  const cargarPresupuesto = usePresupuesto((estado) => estado.cargar)

  const metas = useMetas((estado) => estado.metas)
  const cargandoMetas = useMetas((estado) => estado.cargando)
  const cargarMetas = useMetas((estado) => estado.cargar)

  const recordatorios = useRecordatorios((estado) => estado.recordatorios)
  const cargandoRecordatorios = useRecordatorios((estado) => estado.cargando)
  const cargarRecordatorios = useRecordatorios((estado) => estado.cargar)

  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void cargarIngresos()
    void cargarPresupuesto()
    void cargarMetas()
    void cargarRecordatorios()
    // Se carga una sola vez al entrar; las acciones de Zustand son estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cargando = cargandoIngresos || cargandoPresupuesto || cargandoMetas || cargandoRecordatorios

  const datos = useMemo(
    () =>
      armarDatosInforme({
        usuario,
        ingresos,
        deducciones,
        categorias,
        bolsillos,
        conceptosPorBolsillo,
        metas,
        recordatorios,
      }),
    [usuario, ingresos, deducciones, categorias, bolsillos, conceptosPorBolsillo, metas, recordatorios],
  )

  async function generar(previsualizar: boolean) {
    setError(null)
    setGenerando(true)
    // Si es vista previa, la pestaña se abre YA (dentro del gesto de click,
    // sincrónico) para que ningún bloqueador de pop-ups la confunda con una
    // ventana abierta "por sorpresa" después de esperas asíncronas.
    const ventanaPrevia = previsualizar ? window.open('', '_blank') : null
    try {
      const { generarInformePdf } = await import('@/lib/generarInformePdf')
      const { doc, blob, nombreArchivo } = generarInformePdf(datos)
      if (previsualizar) {
        if (ventanaPrevia) mostrarVistaPrevia(ventanaPrevia, await blobADataUrl(blob), nombreArchivo)
      } else {
        doc.save(nombreArchivo)
      }
    } catch {
      setError('No se pudo generar el informe. Intenta de nuevo.')
      ventanaPrevia?.close()
    } finally {
      setGenerando(false)
    }
  }

  if (cargando) {
    return (
      <div className="grid place-items-center py-24 text-muted">
        <IconoCargando className="size-6 animate-spin" />
      </div>
    )
  }

  const sinIngresos = ingresos.length === 0

  return (
    <>
      <EncabezadoPagina
        titulo="Descargar tu informe"
        descripcion="Un PDF con el resumen completo de tu presupuesto, tus categorías, tu plan y tus metas."
      />

      <Link to="/otros" className="mb-4 inline-flex text-sm font-semibold text-accent hover:underline">
        ← Otros
      </Link>

      {sinIngresos ? (
        <p role="alert" className="rounded-card bg-danger-soft p-4 text-sm text-danger">
          Agrega al menos un ingreso en{' '}
          <Link to="/presupuesto/actualiza" className="font-semibold underline">
            Actualiza
          </Link>{' '}
          para poder generar tu informe.
        </p>
      ) : (
        <div className="flex flex-col gap-4 rounded-panel border border-border bg-surface p-5">
          <div>
            <p className="font-display text-sm font-semibold text-text">Tu informe incluirá</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
              <li>Resumen general y cómo usas tus ingresos</li>
              <li>Detalle por categoría, con lo ideal frente a lo real</li>
              <li>Tu plan línea por línea, categoría por categoría</li>
              <li>Tus deudas, tu distribución por ingreso y tus metas</li>
            </ul>
          </div>

          {error && (
            <p role="alert" className="rounded-card bg-danger-soft p-3 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Boton onClick={() => void generar(false)} cargando={generando} anchoCompleto>
              {generando ? 'Generando informe…' : 'Descargar informe (PDF)'}
            </Boton>
            <Boton variante="secundario" onClick={() => void generar(true)} disabled={generando} anchoCompleto>
              Ver vista previa
            </Boton>
          </div>
        </div>
      )}
    </>
  )
}
