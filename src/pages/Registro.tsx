import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { LayoutAuth } from '@/components/LayoutAuth'
import { Boton } from '@/components/ui/Boton'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { IconoCorreoEnviado } from '@/components/ui/iconos'
import { esCorreoValido, LARGO_MINIMO_CONTRASENA } from '@/lib/validacion'
import { useAuth } from '@/stores/auth'

interface ErroresCampo {
  nombre?: string
  correo?: string
  contrasena?: string
  confirmacion?: string
}

export default function Registro() {
  const registrar = useAuth((estado) => estado.registrar)
  const navegar = useNavigate()

  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [errores, setErrores] = useState<ErroresCampo>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [esperandoConfirmacion, setEsperandoConfirmacion] = useState(false)

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErrorGeneral(null)

    const nuevosErrores: ErroresCampo = {}
    if (nombre.trim().length < 2) nuevosErrores.nombre = 'Escribe tu nombre.'
    if (!esCorreoValido(correo)) nuevosErrores.correo = 'Escribe un correo válido.'
    if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
      nuevosErrores.contrasena = `Mínimo ${LARGO_MINIMO_CONTRASENA} caracteres.`
    }
    if (confirmacion !== contrasena) nuevosErrores.confirmacion = 'Las contraseñas no coinciden.'
    setErrores(nuevosErrores)
    if (Object.keys(nuevosErrores).length > 0) return

    setEnviando(true)
    const resultado = await registrar({ nombre, correo, contrasena })
    setEnviando(false)

    if (!resultado.ok) {
      setErrorGeneral(resultado.mensaje ?? 'No pudimos crear la cuenta.')
      return
    }

    if (resultado.requiereConfirmacion) {
      setEsperandoConfirmacion(true)
      return
    }

    // Sin confirmación de correo ya quedó la sesión abierta; el presupuesto se
    // siembra solo desde el listener de auth (ver src/stores/auth.ts).
    navegar('/', { replace: true })
  }

  // Pantalla posterior al registro cuando el proyecto exige confirmar el correo.
  if (esperandoConfirmacion) {
    return (
      <LayoutAuth
        titulo="Revisa tu correo"
        descripcion="Te enviamos un enlace para confirmar tu cuenta."
        pie={
          <Link to="/entrar" className="font-semibold text-accent hover:underline">
            Volver a iniciar sesión
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="grid size-14 place-items-center rounded-pill bg-accent-soft text-accent">
            <IconoCorreoEnviado className="size-7" />
          </div>
          <p className="text-sm text-muted">
            Enviamos un mensaje a <span className="font-semibold text-text">{correo.trim()}</span>.
            Abre el enlace y vuelve aquí para entrar.
          </p>
          <p className="text-xs text-muted">
            Si no lo ves en unos minutos, revisa la carpeta de spam.
          </p>
        </div>
      </LayoutAuth>
    )
  }

  return (
    <LayoutAuth
      titulo="Crea tu cuenta"
      descripcion="Organiza tu presupuesto en pesos, sin hojas de cálculo."
      error={errorGeneral}
      pie={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/entrar" className="font-semibold text-accent hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={manejarEnvio} className="flex flex-col gap-4" noValidate>
        <CampoTexto
          etiqueta="Nombre"
          autoComplete="given-name"
          placeholder="¿Cómo te llamamos?"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={errores.nombre}
          required
        />

        <CampoTexto
          etiqueta="Correo"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="tucorreo@ejemplo.com"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          error={errores.correo}
          required
        />

        <CampoTexto
          etiqueta="Contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          error={errores.contrasena}
          ayuda={`Mínimo ${LARGO_MINIMO_CONTRASENA} caracteres.`}
          required
        />

        <CampoTexto
          etiqueta="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          error={errores.confirmacion}
          required
        />

        <Boton type="submit" cargando={enviando} anchoCompleto tamano="lg" className="mt-2">
          {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
        </Boton>
      </form>
    </LayoutAuth>
  )
}
