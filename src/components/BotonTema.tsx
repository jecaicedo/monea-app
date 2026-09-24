import { IconoLuna, IconoSol } from '@/components/ui/iconos'
import { useTema } from '@/stores/tema'

/** Alterna entre el tema claro y el oscuro. */
export function BotonTema() {
  const tema = useTema((estado) => estado.tema)
  const alternarTema = useTema((estado) => estado.alternarTema)

  const siguiente = tema === 'oscuro' ? 'claro' : 'oscuro'

  return (
    <button
      type="button"
      onClick={alternarTema}
      title={`Cambiar a tema ${siguiente}`}
      aria-label={`Cambiar a tema ${siguiente}`}
      className="grid size-10 place-items-center rounded-pill text-muted transition-colors hover:bg-surface-2 hover:text-text"
    >
      {tema === 'oscuro' ? <IconoLuna /> : <IconoSol />}
    </button>
  )
}
