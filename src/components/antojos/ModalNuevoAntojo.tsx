import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { Boton } from '@/components/ui/Boton'
import { CampoMoneda } from '@/components/ui/CampoMoneda'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { IconoCamara, IconoCerrar } from '@/components/ui/iconos'
import { Modal } from '@/components/ui/Modal'
import { useAntojos } from '@/stores/antojos'

/**
 * Modal "Nuevo antojo": nombre, precio y una foto opcional (con `capture` para
 * poder abrir la cámara directo en móvil). La foto se comprime y se sube
 * dentro de `crear()`, así que aquí solo se guarda el archivo tal cual.
 */
interface Props {
  abierto: boolean
  onCerrar: () => void
}

export function ModalNuevoAntojo({ abierto, onCerrar }: Props) {
  const crear = useAntojos((estado) => estado.crear)

  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState(0)
  const [foto, setFoto] = useState<File | null>(null)
  const [previsualizacion, setPrevisualizacion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const inputArchivoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (abierto) {
      setNombre('')
      setPrecio(0)
      setFoto(null)
      setPrevisualizacion(null)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  // La URL de objeto de la previsualización hay que liberarla al reemplazarla
  // o al cerrar el modal, para no dejar memoria colgada.
  useEffect(() => {
    return () => {
      if (previsualizacion) URL.revokeObjectURL(previsualizacion)
    }
  }, [previsualizacion])

  function manejarSeleccionFoto(archivo: File | undefined) {
    if (!archivo) return
    if (previsualizacion) URL.revokeObjectURL(previsualizacion)
    setFoto(archivo)
    setPrevisualizacion(URL.createObjectURL(archivo))
  }

  function quitarFoto() {
    if (previsualizacion) URL.revokeObjectURL(previsualizacion)
    setFoto(null)
    setPrevisualizacion(null)
    if (inputArchivoRef.current) inputArchivoRef.current.value = ''
  }

  async function manejarCrear(evento: FormEvent) {
    evento.preventDefault()

    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) {
      setError('Ponle un nombre al antojo.')
      return
    }
    if (precio <= 0) {
      setError('Ponle un precio.')
      return
    }

    setCreando(true)
    await crear(nombreLimpio, precio, foto)
    setCreando(false)
    onCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Nuevo antojo"
      descripcion="Tómale foto a lo que quieres y mira en cuánto tiempo te alcanza."
    >
      <form onSubmit={manejarCrear} className="flex flex-col gap-4">
        <CampoTexto
          etiqueta="¿Qué es?"
          placeholder="Ej. Tenis, tiquetes, celular"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoFocus
        />

        <CampoMoneda etiqueta="Precio" valor={precio} onCambio={setPrecio} />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Foto (opcional)</span>

          {previsualizacion ? (
            <div className="relative w-fit">
              <img
                src={previsualizacion}
                alt="Previsualización del antojo"
                className="h-32 w-32 rounded-card border border-border object-cover"
              />
              <button
                type="button"
                onClick={quitarFoto}
                aria-label="Quitar foto"
                className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-pill border border-border bg-surface text-muted shadow-card transition-colors hover:text-text"
              >
                <IconoCerrar className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputArchivoRef.current?.click()}
              className="flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <IconoCamara className="size-6" />
              <span className="text-xs font-medium">Añadir foto</span>
            </button>
          )}

          <input
            ref={inputArchivoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => manejarSeleccionFoto(e.target.files?.[0])}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Boton type="submit" cargando={creando} anchoCompleto>
          Guardar antojo
        </Boton>
      </form>
    </Modal>
  )
}
