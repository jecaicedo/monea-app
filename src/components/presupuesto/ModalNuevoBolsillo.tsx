import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { Boton } from '@/components/ui/Boton'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { Modal } from '@/components/ui/Modal'
import { Selector } from '@/components/ui/Selector'
import { usePresupuesto } from '@/stores/presupuesto'
import type { Categoria } from '@/types/basedatos'

/**
 * Modal "Nuevo bolsillo": nombre + a qué categoría pertenece.
 */
interface Props {
  abierto: boolean
  onCerrar: () => void
  categorias: Categoria[]
  /** Categoría preseleccionada (la que esté activa en los chips), si hay una. */
  categoriaIdInicial: string | null
}

export function ModalNuevoBolsillo({ abierto, onCerrar, categorias, categoriaIdInicial }: Props) {
  const crearBolsillo = usePresupuesto((estado) => estado.crearBolsillo)

  const [nombre, setNombre] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  // Cada vez que se abre, arranca limpio (con la categoría de los chips
  // preseleccionada, si había una específica activa).
  useEffect(() => {
    if (abierto) {
      setNombre('')
      setCategoriaId(categoriaIdInicial ?? categorias[0]?.id ?? '')
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  async function manejarCrear(evento: FormEvent) {
    evento.preventDefault()

    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) {
      setError('Ponle un nombre al bolsillo.')
      return
    }
    if (!categoriaId) {
      setError('Elige a qué categoría pertenece.')
      return
    }

    setCreando(true)
    await crearBolsillo(categoriaId, nombreLimpio)
    setCreando(false)
    onCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Nuevo bolsillo"
      descripcion="Aparecerá también en la pestaña Bolsillos, listo para llenarlo de conceptos."
    >
      <form onSubmit={manejarCrear} className="flex flex-col gap-4">
        <CampoTexto
          etiqueta="Nombre del bolsillo"
          placeholder="Ej. MASCOTAS, GASOLINA"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoFocus
        />

        <Selector
          etiqueta="Categoría"
          opciones={categorias.map((categoria) => ({ valor: categoria.id, etiqueta: categoria.nombre }))}
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
        />

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Boton type="submit" cargando={creando} anchoCompleto>
          Crear bolsillo
        </Boton>
      </form>
    </Modal>
  )
}
