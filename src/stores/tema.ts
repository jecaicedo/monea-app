import { create } from 'zustand'

/**
 * Store del tema visual (claro / oscuro).
 *
 * El tema se aplica como atributo `data-theme` en <html>; los valores de cada
 * paleta viven en src/styles/theme.css. Aquí solo decidimos cuál está activo y
 * lo recordamos en localStorage.
 */

export type Tema = 'oscuro' | 'claro'

const CLAVE_ALMACENAMIENTO = 'miplata:tema'

/** Color de la barra del navegador por tema. Debe coincidir con --color-bg. */
const COLOR_BARRA: Record<Tema, string> = {
  oscuro: '#0D0F12',
  claro: '#F4F6F8',
}

/**
 * Tema inicial: el que el usuario eligió antes; si nunca eligió, el del
 * sistema operativo, y si tampoco se puede saber, oscuro (nuestro default).
 *
 * Ojo: el mismo cálculo está duplicado en un script inline en index.html. Eso
 * es a propósito: ese script corre antes del primer pintado y evita el
 * "flashazo" blanco mientras React arranca.
 */
export function leerTemaGuardado(): Tema {
  try {
    const guardado = window.localStorage.getItem(CLAVE_ALMACENAMIENTO)
    if (guardado === 'claro' || guardado === 'oscuro') return guardado
  } catch {
    // localStorage bloqueado (modo privado, permisos): seguimos con el default.
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro'
}

/** Escribe el tema en el DOM. Es lo único que realmente "cambia los colores". */
export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.theme = tema
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[tema])
}

interface EstadoTema {
  tema: Tema
  establecerTema: (tema: Tema) => void
  alternarTema: () => void
}

export const useTema = create<EstadoTema>()((set, get) => ({
  tema: leerTemaGuardado(),

  establecerTema: (tema) => {
    aplicarTema(tema)
    try {
      window.localStorage.setItem(CLAVE_ALMACENAMIENTO, tema)
    } catch {
      // Si no podemos guardar, el tema igual funciona durante esta sesión.
    }
    set({ tema })
  },

  alternarTema: () => {
    const { tema, establecerTema } = get()
    establecerTema(tema === 'oscuro' ? 'claro' : 'oscuro')
  },
}))
