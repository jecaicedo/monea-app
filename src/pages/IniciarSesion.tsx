import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { LayoutAuth } from '@/components/LayoutAuth'
import { Boton } from '@/components/ui/Boton'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { esCorreoValido } from '@/lib/validacion'
import { useAuth } from '@/stores/auth'

interface EstadoUbicacion {
  desde?: string
}

export default function IniciarSesion() {
  const iniciarSesion = useAuth((estado) => estado.iniciarSesion)
  const navegar = useNavigate()
  const ubicacion = useLocation()

  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [errores, setErrores] = useState<{ correo?: string; contrasena?: string }>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErrorGeneral(null)

    const nuevosErrores: typeof errores = {}
    if (!esCorreoValido(correo)) nuevosErrores.correo = 'Escribe un correo válido.'
    if (!contrasena) nuevosErrores.contrasena = 'Escribe tu contraseña.'
    setErrores(nuevosErrores)
    if (Object.keys(nuevosErrores).length > 0) return

    setEnviando(true)
    const resultado = await iniciarSesion({ correo, contrasena })
    setEnviando(false)

    if (!resultado.ok) {
      setErrorGeneral(resultado.mensaje ?? 'No pudimos iniciar sesión.')
      return
    }

    // Lo devolvemos a donde iba antes de que lo mandáramos al login.
    const destino = (ubicacion.state as EstadoUbicacion | null)?.desde ?? '/'
    navegar(destino, { replace: true })
  }

  return (
    <LayoutAuth
      titulo="Bienvenido a Monea"
      descripcion="Entra para ver cómo va tu plata este mes."
      error={errorGeneral}
      pie={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-accent hover:underline">
            Regístrate
          </Link>
        </>
      }
    >
      <form onSubmit={manejarEnvio} className="flex flex-col gap-4" noValidate>
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
          autoComplete="current-password"
          placeholder="••••••••"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          error={errores.contrasena}
          required
        />

        <Boton type="submit" cargando={enviando} anchoCompleto tamano="lg" className="mt-2">
          {enviando ? 'Entrando…' : 'Entrar'}
        </Boton>
      </form>
    </LayoutAuth>
  )
}
