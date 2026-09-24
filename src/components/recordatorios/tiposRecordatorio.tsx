import type { ComponentType, SVGProps } from 'react'

import { IconoAuto, IconoCampana, IconoPago, IconoPastel, IconoTarjeta } from '@/components/ui/iconos'
import type { TipoRecordatorio } from '@/types/basedatos'

/**
 * Configuración de los 5 tipos de recordatorio, compartida entre el selector
 * de tipo del modal (cuadrícula de íconos, no un <select> nativo: un <option>
 * no puede mostrar un ícono) y el ícono de cada tarjeta.
 *
 * A propósito NO llevan un color propio: el rojo/acento de la app quedan
 * reservados para el ESTADO de proximidad (vencido/próximo) de cada
 * recordatorio, calculado aparte en `lib/recordatorios.ts`.
 */
interface ConfigTipoRecordatorio {
  valor: TipoRecordatorio
  etiqueta: string
  Icono: ComponentType<SVGProps<SVGSVGElement>>
  placeholderTitulo: string
}

export const TIPOS_RECORDATORIO: ConfigTipoRecordatorio[] = [
  { valor: 'pago', etiqueta: 'Pago', Icono: IconoPago, placeholderTitulo: 'Ej. Cuota del carro' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta', Icono: IconoTarjeta, placeholderTitulo: 'Ej. Corte tarjeta Visa' },
  { valor: 'cumpleanos', etiqueta: 'Cumpleaños', Icono: IconoPastel, placeholderTitulo: 'Ej. Cumpleaños de mamá' },
  { valor: 'pico_y_placa', etiqueta: 'Pico y placa', Icono: IconoAuto, placeholderTitulo: 'Ej. Pico y placa del carro' },
  { valor: 'otro', etiqueta: 'Otro', Icono: IconoCampana, placeholderTitulo: 'Ej. Renovar el seguro' },
]

export function obtenerConfigTipo(tipo: TipoRecordatorio): ConfigTipoRecordatorio {
  return TIPOS_RECORDATORIO.find((config) => config.valor === tipo) ?? TIPOS_RECORDATORIO[TIPOS_RECORDATORIO.length - 1]
}
