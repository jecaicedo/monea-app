/**
 * Utilidades de imagen del lado del cliente. Sirve para no gastar storage ni
 * ancho de banda subiendo fotos de cámara a resolución completa.
 */

interface OpcionesCompresion {
  /** Lado más largo, en píxeles, al que se reescala la imagen. */
  ladoMaximo?: number
  /** Calidad JPEG, de 0 a 1. */
  calidad?: number
}

/**
 * Reescala una imagen a `ladoMaximo` (sin recortarla) y la reexporta como
 * JPEG con la `calidad` indicada. Si la imagen ya es más pequeña, no la
 * agranda: solo cambia el formato/calidad de salida.
 */
export async function comprimirImagen(
  archivo: File,
  { ladoMaximo = 1000, calidad = 0.8 }: OpcionesCompresion = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo)

  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height))
  const ancho = Math.round(bitmap.width * escala)
  const alto = Math.round(bitmap.height * escala)

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto

  const contexto = lienzo.getContext('2d')
  if (!contexto) throw new Error('No se pudo procesar la imagen en este navegador.')
  contexto.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => lienzo.toBlob(resolve, 'image/jpeg', calidad))
  if (!blob) throw new Error('No se pudo comprimir la imagen.')
  return blob
}
