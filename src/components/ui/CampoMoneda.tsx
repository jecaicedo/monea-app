import { useId, useState } from 'react'

import { formatearNumero } from '@/lib/formato'

/**
 * Campo de dinero: muestra separador de miles mientras se escribe (COP no usa
 * centavos) y siempre entrega al padre un `number` limpio, nunca el texto
 * formateado.
 */

interface Props {
  etiqueta: string
  valor: number
  onCambio: (valor: number) => void
  ayuda?: string
  placeholder?: string
  /** Oculta visualmente la etiqueta pero la conserva para lectores de pantalla. */
  ocultarEtiqueta?: boolean
  id?: string
  disabled?: boolean
}

/** Deja solo dígitos y los convierte a número (vacío -> 0). */
function aNumero(texto: string): number {
  const limpio = texto.replace(/[^\d]/g, '')
  return limpio ? Number(limpio) : 0
}

export function CampoMoneda({
  etiqueta,
  valor,
  onCambio,
  ayuda,
  placeholder = '0',
  ocultarEtiqueta = false,
  id: idProp,
  disabled = false,
}: Props) {
  const idGenerado = useId()
  const id = idProp ?? idGenerado
  const idAyuda = `${id}-ayuda`

  const [enfocado, setEnfocado] = useState(false)
  const [texto, setTexto] = useState(() => (valor ? formatearNumero(valor) : ''))
  // Recuerda el último `valor` ya reflejado en `texto`, para notar cuándo
  // cambió "desde afuera" (se cargó del servidor, se limpió el campo…).
  const [ultimoValorSincronizado, setUltimoValorSincronizado] = useState(valor)

  // Si el valor cambia desde fuera y el campo no está siendo editado,
  // reflejamos el nuevo valor. Mientras el usuario escribe, no lo pisamos
  // aunque llegue una actualización externa. Se ajusta durante el render
  // (patrón recomendado por React para "derivar estado de props") en vez de
  // en un efecto, para no disparar un render adicional después de pintar.
  if (!enfocado && valor !== ultimoValorSincronizado) {
    setUltimoValorSincronizado(valor)
    setTexto(valor ? formatearNumero(valor) : '')
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={ocultarEtiqueta ? 'sr-only' : 'text-sm font-medium text-text'}>
        {etiqueta}
      </label>

      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={texto}
          disabled={disabled}
          aria-describedby={ayuda ? idAyuda : undefined}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          onChange={(e) => {
            const numero = aNumero(e.target.value)
            setTexto(numero ? formatearNumero(numero) : '')
            onCambio(numero)
          }}
          className="h-11 w-full rounded-card border border-border bg-surface-2 py-2 pr-3.5 pl-7 text-base text-text outline-none transition-colors placeholder:text-muted focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {ayuda && (
        <p id={idAyuda} className="text-xs text-muted">
          {ayuda}
        </p>
      )}
    </div>
  )
}
