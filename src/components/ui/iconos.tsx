import type { SVGProps } from 'react'

/**
 * Iconos propios en SVG inline.
 *
 * No usamos una librería de iconos para no sumar dependencias: son pocos y
 * así controlamos el trazo. Todos heredan el color con `currentColor`, así
 * que se pintan con las utilidades de texto (text-accent, text-muted…) y
 * nunca llevan un color literal.
 */

type PropsIcono = SVGProps<SVGSVGElement>

function Base({ children, ...props }: PropsIcono) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconoOjo(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  )
}

export function IconoOjoTachado(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.8 3.7M6.3 6.8A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1.4 0 2.6-.3 3.7-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </Base>
  )
}

export function IconoAlerta(props: PropsIcono) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.2h.01" />
    </Base>
  )
}

export function IconoCorreoEnviado(props: PropsIcono) {
  return (
    <Base {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m3.5 7 7.3 5.2a2 2 0 0 0 2.4 0L20.5 7" />
    </Base>
  )
}

export function IconoSalir(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M9.5 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.5" />
      <path d="M16 16.5 20.5 12 16 7.5" />
      <path d="M20.5 12H9.5" />
    </Base>
  )
}

/** Círculo giratorio para estados de carga. */
export function IconoCargando(props: PropsIcono) {
  return (
    <Base className="size-5 animate-spin" {...props}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </Base>
  )
}

/* -------------------------------------------------------------------------- */
/* Navegación                                                                 */
/* -------------------------------------------------------------------------- */

/** Metas: una diana. */
export function IconoMetas(props: PropsIcono) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </Base>
  )
}

/** Bolsillos: una billetera. */
export function IconoBolsillos(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h11.5a2 2 0 0 1 2 2v1.5" />
      <path d="M3.5 7.5v9A2.5 2.5 0 0 0 6 19h12a2 2 0 0 0 2-2v-2" />
      <path d="M20.5 10.5h-4a2 2 0 0 0 0 4h4a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5Z" />
    </Base>
  )
}

/** Otros: cuadrícula de opciones. */
export function IconoOtros(props: PropsIcono) {
  return (
    <Base {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </Base>
  )
}

/* -------------------------------------------------------------------------- */
/* Cabecera                                                                   */
/* -------------------------------------------------------------------------- */

export function IconoSol(props: PropsIcono) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </Base>
  )
}

export function IconoLuna(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2Z" />
    </Base>
  )
}

/** Instalar: flecha hacia un dispositivo. */
export function IconoInstalar(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M12 3.5v10" />
      <path d="m8.5 10 3.5 3.5 3.5-3.5" />
      <path d="M4.5 16v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V16" />
    </Base>
  )
}

export function IconoFlechaAbajo(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </Base>
  )
}

/* -------------------------------------------------------------------------- */
/* Formularios y acciones                                                     */
/* -------------------------------------------------------------------------- */

export function IconoMas(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  )
}

export function IconoBasura(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 12.5A2 2 0 0 0 9 21h6a2 2 0 0 0 2-1.5L18 7" />
      <path d="M10 11v6M14 11v6" />
    </Base>
  )
}

export function IconoCheck(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Base>
  )
}

export function IconoCerrar(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Base>
  )
}

/** Tendencia positiva: flecha ascendente. */
export function IconoTendenciaSube(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M3.5 16.5 10 10l4 4 6.5-6.5" />
      <path d="M15 7h5.5v5.5" />
    </Base>
  )
}

/** Tendencia negativa: flecha descendente. */
export function IconoTendenciaBaja(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M3.5 7.5 10 14l4-4 6.5 6.5" />
      <path d="M15 17h5.5v-5.5" />
    </Base>
  )
}

/** Ingresos: un recibo. */
export function IconoRecibo(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M6 2.5h12v19l-2.5-1.5-2 1.5-2-1.5-2 1.5-2-1.5-1.5 1.5Z" />
      <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" />
    </Base>
  )
}

/** Editar/renombrar: un lápiz. */
export function IconoLapiz(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="m14.5 4.5 5 5L8 21H3v-5Z" />
      <path d="m12.5 6.5 5 5" />
    </Base>
  )
}

/** Etapa bloqueada: un candado cerrado. */
export function IconoCandado(props: PropsIcono) {
  return (
    <Base {...props}>
      <rect x="5" y="11" width="14" height="9.5" rx="2" />
      <path d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" />
    </Base>
  )
}

/** Fondo de emergencia: un escudo. */
export function IconoEscudo(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M12 3.5 5 6.5v5c0 5 3 8 7 9 4-1 7-4 7-9v-5Z" />
    </Base>
  )
}

/** Distribuir: un origen que se reparte en varios destinos. */
export function IconoDistribuir(props: PropsIcono) {
  return (
    <Base {...props}>
      <circle cx="12" cy="4.3" r="1.8" />
      <path d="M12 6.1v2.6M6 8.7h12M6 8.7v6.3M12 8.7v6.3M18 8.7v6.3" />
      <circle cx="6" cy="17" r="1.8" />
      <circle cx="12" cy="17" r="1.8" />
      <circle cx="18" cy="17" r="1.8" />
    </Base>
  )
}

/** Logro cumplido: una medalla. */
export function IconoMedalla(props: PropsIcono) {
  return (
    <Base {...props}>
      <circle cx="12" cy="14.5" r="6" />
      <path d="M12 11.5v6M9.3 14.5h5.4" />
      <path d="m9 8.5-3-6M15 8.5l3-6" />
    </Base>
  )
}

/** Subir/tomar foto: una cámara. */
export function IconoCamara(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5Z" />
      <circle cx="12" cy="13" r="3.5" />
    </Base>
  )
}

/** Antojo sin foto todavía: un regalo. */
export function IconoRegalo(props: PropsIcono) {
  return (
    <Base {...props}>
      <rect x="4" y="9.5" width="16" height="10" rx="1.5" />
      <path d="M4 13h16M12 9.5V20" />
      <path d="M12 9.5c-1.5 0-4.5-.5-4.5-3S10 3.5 12 6.5c2-3 4.5-2 4.5 0S13.5 9.5 12 9.5Z" />
    </Base>
  )
}

/** Recordatorio de tipo "Pago": una moneda. */
export function IconoPago(props: PropsIcono) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v10" />
      <path d="M14.5 9.5c0-1.3-1.1-2-2.5-2s-2.5.6-2.5 1.8c0 2.6 5 1.2 5 3.8 0 1.2-1.1 1.9-2.5 1.9s-2.5-.7-2.5-2" />
    </Base>
  )
}

/** Recordatorio de tipo "Tarjeta": una tarjeta con banda. */
export function IconoTarjeta(props: PropsIcono) {
  return (
    <Base {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M6.5 14.5h3" />
    </Base>
  )
}

/** Recordatorio de tipo "Cumpleaños": un pastel con vela. */
export function IconoPastel(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M4 20v-5.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2V20" />
      <path d="M4 20h16" />
      <path d="M4 14.5c1-1 2-1 3 0s2 1 3 0 2-1 3 0 2 1 3 0 2-1 3 0" />
      <path d="M12 12.5V9.5" />
      <path d="M12 9.5c-1 0-1.6-.6-1.6-1.4 0-1 1.6-2.6 1.6-2.6s1.6 1.6 1.6 2.6c0 .8-.6 1.4-1.6 1.4Z" />
    </Base>
  )
}

/** Recordatorio de tipo "Pico y placa": un carro visto de lado. */
export function IconoAuto(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M4 16.5v-3l2-4.3a2 2 0 0 1 1.8-1.2h8.4a2 2 0 0 1 1.8 1.2l2 4.3v3.5" />
      <path d="M4 16.5h16" />
      <circle cx="8" cy="17.5" r="1.6" />
      <circle cx="16" cy="17.5" r="1.6" />
    </Base>
  )
}

/** Recordatorio genérico (tipo "Otro") y del módulo en general: una campana. */
export function IconoCampana(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M12 4.5a5 5 0 0 0-5 5v2.3c0 .9-.3 1.8-.9 2.5L5 15.8c-.6.7 0 1.7.9 1.7h12.2c.9 0 1.5-1 .9-1.7l-1.1-1.5a3.9 3.9 0 0 1-.9-2.5V9.5a5 5 0 0 0-5-5Z" />
      <path d="M10.3 19a1.8 1.8 0 0 0 3.4 0" />
    </Base>
  )
}

/** Informe descargable: una hoja de documento con líneas de texto. */
export function IconoInforme(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9 12.5h6M9 15.5h6M9 18.5h3.5" />
    </Base>
  )
}

/** Presupuesto: un gráfico circular repartido en porciones. */
export function IconoPresupuesto(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5" />
      <path d="M12 3.5V12l6.2-6.2A8.47 8.47 0 0 0 12 3.5Z" fill="currentColor" stroke="none" />
      <path d="M12 12 5.8 5.8A8.47 8.47 0 0 0 3.5 12" />
    </Base>
  )
}
