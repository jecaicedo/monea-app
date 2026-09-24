import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { Boton } from '@/components/ui/Boton'
import { CampoMoneda } from '@/components/ui/CampoMoneda'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { Modal } from '@/components/ui/Modal'
import { useMetas } from '@/stores/metas'

/** Modal "Nueva meta": nombre y monto objetivo. Mismo esqueleto que ModalNuevoBolsillo. */
interface Props {
  abierto: boolean
  onCerrar: () => void
}

export function ModalNuevaMeta({ abierto, onCerrar }: Props) {
  const crearMeta = useMetas((estado) => estado.crearMeta)

  const [nombre, setNombre] = useState('')
  const [montoObjetivo, setMontoObjetivo] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    if (abierto) {
      setNombre('')
      setMontoObjetivo(0)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  async function manejarCrear(evento: FormEvent) {
    evento.preventDefault()

    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) {
      setError('Ponle un nombre a la meta.')
      return
    }

    setCreando(true)
    await crearMeta(nombreLimpio, montoObjetivo)
    setCreando(false)
    onCerrar()
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nueva meta" descripcion="Ponle nombre y cuánto quieres reunir.">
      <form onSubmit={manejarCrear} className="flex flex-col gap-4">
        <CampoTexto
          etiqueta="Nombre de la meta"
          placeholder="Ej. Vacaciones, Portátil nuevo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoFocus
        />

        <CampoMoneda etiqueta="Monto objetivo" valor={montoObjetivo} onCambio={setMontoObjetivo} />

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Boton type="submit" cargando={creando} anchoCompleto>
          Crear meta
        </Boton>
      </form>
    </Modal>
  )
}
