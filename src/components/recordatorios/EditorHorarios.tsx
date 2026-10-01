import { Boton } from '@/components/ui/Boton'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { IconoBasura, IconoMas } from '@/components/ui/iconos'
import { MAX_HORARIOS } from '@/stores/recordatorios'

/**
 * Lista editable de horas de aviso, hasta tres. Es presentacional a propósito:
 * el modal la usa contra estado local (el recordatorio todavía no existe, así
 * que no hay dónde colgar las horas) y la tarjeta contra el store con autosave.
 */
interface Props {
  /** Horas en formato 'HH:MM', ya ordenadas por quien las pasa. */
  horarios: { id: string; hora: string }[]
  onAgregar: () => void
  onCambiar: (id: string, hora: string) => void
  onEliminar: (id: string) => void
}

export function EditorHorarios({ horarios, onAgregar, onCambiar, onEliminar }: Props) {
  const lleno = horarios.length >= MAX_HORARIOS

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-text">Horarios de aviso</span>

      {horarios.length === 0 ? (
        <p className="text-xs text-muted">Sin horarios: te avisaremos a las 8:00 a.&nbsp;m.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {horarios.map((horario, indice) => (
            <li key={horario.id} className="flex items-center gap-2">
              {/* min-w-0 es imprescindible: un <input type="time"> trae un ancho
                  mínimo propio del navegador y, sin esto, un hijo de flex no
                  baja de ese ancho — se desborda y se mete debajo del botón de
                  borrar en pantallas angostas. */}
              <div className="min-w-0 flex-1">
                <CampoTexto
                  etiqueta={`Hora ${indice + 1}`}
                  ocultarEtiqueta
                  type="time"
                  value={horario.hora}
                  onChange={(e) => onCambiar(horario.id, e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => onEliminar(horario.id)}
                aria-label={`Eliminar el horario ${indice + 1}`}
                className="grid size-11 shrink-0 place-items-center rounded-card text-muted transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <IconoBasura className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!lleno && (
        <Boton variante="secundario" tamano="sm" onClick={onAgregar} className="self-start">
          <IconoMas className="size-4" />
          Agregar horario
        </Boton>
      )}

      <p className="text-xs text-muted">
        El aviso puede llegar entre 5 y 15 minutos después de la hora. Hora de Colombia.
      </p>
    </div>
  )
}
