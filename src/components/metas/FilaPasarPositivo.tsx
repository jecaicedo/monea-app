import { Link } from 'react-router-dom'

import { Acordeon } from '@/components/ui/Acordeon'
import { IconoFlechaAbajo, IconoTendenciaBaja, IconoTendenciaSube } from '@/components/ui/iconos'
import { formatearCOP } from '@/lib/formato'
import { calcularEnPositivo } from '@/lib/metas'

/**
 * Etapa 1, como fila de acordeón: contraída muestra el excedente con su
 * color; expandida explica qué significa. No se edita manualmente — es un
 * espejo en vivo del presupuesto.
 */
interface Props {
  excedente: number
  abierta: boolean
  onAlternar: () => void
}

export function FilaPasarPositivo({ excedente, abierta, onAlternar }: Props) {
  const enPositivo = calcularEnPositivo(excedente)
  const claseTono = enPositivo ? 'bg-positive-soft text-positive' : 'bg-danger-soft text-danger'
  const claseTexto = enPositivo ? 'text-positive' : 'text-danger'

  return (
    // El div envolvente hace que esta fila cuente como UN solo hijo dentro
    // del contenedor `divide-y` de Metas.tsx (Acordeon devuelve un Fragment
    // con encabezado y cuerpo como hermanos, no un único elemento).
    <div>
      <Acordeon
        abierta={abierta}
        claseCuerpo="border-t border-border p-4 sm:p-5"
        encabezado={
          <button
            type="button"
            onClick={onAlternar}
            aria-expanded={abierta}
            className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-2 sm:p-5"
          >
            <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-full ${claseTono}`}>
              {enPositivo ? <IconoTendenciaSube className="size-4" /> : <IconoTendenciaBaja className="size-4" />}
            </span>
            <span className="min-w-0 flex-1 truncate font-display text-base font-semibold text-text">
              Pasar en positivo
            </span>
            <span className={`cifra shrink-0 text-sm font-semibold wrap-break-word ${claseTexto}`}>
              {formatearCOP(excedente)}
            </span>
            <IconoFlechaAbajo
              className={`size-4 shrink-0 text-muted transition-transform ${abierta ? 'rotate-180' : ''}`}
            />
          </button>
        }
      >
        <p className="text-sm text-text">
          Te queda <span className={`cifra font-semibold ${claseTexto}`}>{formatearCOP(excedente)}</span> cada mes.
        </p>
        <p className="mt-1 text-sm text-muted">
          {enPositivo
            ? '¡Ya estás en positivo! Puedes construir tu fondo de emergencia.'
            : 'Estás gastando más de lo que ganas. Primer objetivo: pasar a positivo.'}
        </p>
        {!enPositivo && (
          <Link
            to="/presupuesto/revisa"
            className="mt-2 inline-flex text-sm font-semibold text-accent hover:underline"
          >
            Ajustar presupuesto en Revisa →
          </Link>
        )}
      </Acordeon>
    </div>
  )
}
