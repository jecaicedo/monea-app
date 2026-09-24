import { Proximamente } from '@/components/EncabezadoPagina'
import { IconoDistribuir } from '@/components/ui/iconos'

/** Sub-pestaña "Distribuir" del presupuesto: todavía no se construye. */
export default function Distribuir() {
  return (
    <Proximamente
      icono={IconoDistribuir}
      titulo="Distribuir"
      descripcion="Muy pronto vas a poder repartir cada gasto entre tus cuentas y ver, en vivo, cuánto te queda libre en cada una para tus metas."
    />
  )
}
