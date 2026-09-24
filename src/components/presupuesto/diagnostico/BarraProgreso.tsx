/**
 * Barra de una sola categoría: qué fracción de los ingresos consume, en el
 * color propio de esa categoría (dato de la fila, no un token de tema — misma
 * excepción ya usada en ChipsCategorias).
 */
interface Props {
  fraccion: number
  color: string
}

export function BarraProgreso({ fraccion, color }: Props) {
  const ancho = Math.max(0, Math.min(100, fraccion * 100))

  return (
    <div className="h-2 w-full overflow-hidden rounded-pill bg-surface-2">
      <div className="h-full rounded-pill" style={{ width: `${ancho}%`, backgroundColor: color }} />
    </div>
  )
}
