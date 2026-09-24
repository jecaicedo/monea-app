/**
 * Debounce por clave: agrupa llamadas que comparten una clave (ej. el id de
 * una fila) y solo ejecuta la última tras `esperaMs` sin nuevas llamadas para
 * esa misma clave.
 *
 * Sirve para el autosave de formularios con muchas filas editables a la vez
 * (ingresos, bolsillos…): cada fila tiene su propio temporizador, así que
 * editar dos tarjetas al tiempo no hace que se pisen los guardados entre sí.
 */
export function crearDebouncePorClave(esperaMs: number) {
  const temporizadores = new Map<string, ReturnType<typeof setTimeout>>()

  function programar(clave: string, tarea: () => void): void {
    const existente = temporizadores.get(clave)
    if (existente) clearTimeout(existente)

    const id = setTimeout(() => {
      temporizadores.delete(clave)
      tarea()
    }, esperaMs)

    temporizadores.set(clave, id)
  }

  function cancelar(clave: string): void {
    const existente = temporizadores.get(clave)
    if (existente) {
      clearTimeout(existente)
      temporizadores.delete(clave)
    }
  }

  return { programar, cancelar }
}
