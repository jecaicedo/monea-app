import { IconoMedalla } from '@/components/ui/iconos'
import { formatearCOP, formatearFecha } from '@/lib/formato'
import type { Meta } from '@/types/basedatos'

/**
 * "Las metas que has logrado": solo lo que está logrado AHORA MISMO según el
 * cálculo en vivo de quien llama (ver `Metas.tsx`) — si el fondo de
 * emergencia se descompleta, sale de aquí hasta recuperarse; una meta propia
 * ya lograda se queda, porque su logro no depende de la cascada.
 */
interface Props {
  logros: Meta[]
}

export function SeccionLogros({ logros }: Props) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-sm font-semibold tracking-wide text-muted uppercase">
        Las metas que has logrado
      </h2>

      {logros.length === 0 ? (
        <p className="rounded-panel border border-dashed border-border bg-surface/50 px-6 py-10 text-center text-sm text-muted">
          Aún no has cumplido metas. Cuando logres la primera, vivirá aquí.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {logros.map((meta) => (
            <div
              key={meta.id}
              className="flex items-center gap-3 rounded-card border border-border bg-surface p-3.5"
            >
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft">
                <IconoMedalla className="size-5 text-accent" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-text">{meta.nombre}</p>
                {meta.fecha_lograda && <p className="text-xs text-muted">{formatearFecha(meta.fecha_lograda)}</p>}
              </div>
              <span className="cifra shrink-0 text-sm font-semibold wrap-break-word text-muted">
                {formatearCOP(meta.monto_objetivo)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
