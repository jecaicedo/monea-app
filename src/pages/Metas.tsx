import { useEffect, useMemo, useState } from 'react'

import { EncabezadoPagina } from '@/components/EncabezadoPagina'
import { AvisoRecordatorios } from '@/components/recordatorios/AvisoRecordatorios'
import { FilaFondoEmergencia } from '@/components/metas/FilaFondoEmergencia'
import { FilaMetas } from '@/components/metas/FilaMetas'
import { FilaPasarPositivo } from '@/components/metas/FilaPasarPositivo'
import { SeccionLogros } from '@/components/metas/SeccionLogros'
import { IconoCargando } from '@/components/ui/iconos'
import { calcularEnPositivo, calcularFondoLogrado, estaMetaLograda } from '@/lib/metas'
import { useAuth } from '@/stores/auth'
import { calcularTotalIngresosNetos, useIngresos } from '@/stores/ingresos'
import { useMetas } from '@/stores/metas'
import { calcularTotalAhorro, calcularTotalGastos, usePresupuesto } from '@/stores/presupuesto'
import type { TipoMeta } from '@/types/basedatos'

/**
 * Pantalla de Inicio: la progresión gamificada por etapas. Pasar en positivo
 * → Fondo de emergencia → Metas propias, en cascada y siempre reversible (ver
 * `lib/metas.ts`). Es la primera pantalla que ve el usuario (pestaña "Metas").
 */
export default function Metas() {
  const usuario = useAuth((estado) => estado.usuario)
  // El nombre viaja en los metadatos del usuario desde el registro (ver
  // stores/auth.ts); solo se usa la primera palabra para un saludo corto.
  const nombreUsuario = (usuario?.user_metadata?.nombre as string | undefined)?.trim().split(/\s+/)[0]

  const ingresos = useIngresos((estado) => estado.ingresos)
  const deducciones = useIngresos((estado) => estado.deducciones)
  const cargandoIngresos = useIngresos((estado) => estado.cargando)
  const cargarIngresos = useIngresos((estado) => estado.cargar)

  const categorias = usePresupuesto((estado) => estado.categorias)
  const bolsillos = usePresupuesto((estado) => estado.bolsillos)
  const conceptosPorBolsillo = usePresupuesto((estado) => estado.conceptosPorBolsillo)
  const cargandoPresupuesto = usePresupuesto((estado) => estado.cargando)
  const cargarPresupuesto = usePresupuesto((estado) => estado.cargar)

  const metas = useMetas((estado) => estado.metas)
  const cargandoMetas = useMetas((estado) => estado.cargando)
  const cargarMetas = useMetas((estado) => estado.cargar)
  const sincronizarConExcedente = useMetas((estado) => estado.sincronizarConExcedente)

  // Qué filas del acordeón están expandidas. Todas contraídas por defecto,
  // igual que los bolsillos y los ingresos.
  const [abiertas, setAbiertas] = useState<Set<TipoMeta>>(new Set())
  function alternar(tipo: TipoMeta) {
    setAbiertas((actual) => {
      const siguiente = new Set(actual)
      if (siguiente.has(tipo)) siguiente.delete(tipo)
      else siguiente.add(tipo)
      return siguiente
    })
  }

  useEffect(() => {
    void cargarIngresos()
    void cargarPresupuesto()
    void cargarMetas()
    // Se carga una sola vez al entrar; las acciones de Zustand son estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalIngresos = calcularTotalIngresosNetos(ingresos, deducciones)
  const totalGastos = useMemo(
    () => calcularTotalGastos(categorias, bolsillos, conceptosPorBolsillo),
    [categorias, bolsillos, conceptosPorBolsillo],
  )
  const totalAhorro = useMemo(
    () => calcularTotalAhorro(categorias, bolsillos, conceptosPorBolsillo),
    [categorias, bolsillos, conceptosPorBolsillo],
  )
  const excedente = totalIngresos - totalGastos - totalAhorro

  // Recalcula la cascada (y corrige `estado` en Supabase si hace falta) cada
  // vez que el excedente en vivo cambia — no en cada tecleo, solo cuando el
  // número resultante realmente se mueve.
  useEffect(() => {
    void sincronizarConExcedente(excedente)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excedente])

  const cargando = cargandoIngresos || cargandoPresupuesto || cargandoMetas

  if (cargando) {
    return (
      <div className="grid place-items-center py-24 text-muted">
        <IconoCargando className="size-6 animate-spin" />
      </div>
    )
  }

  const metaFondo = metas.find((meta) => meta.tipo === 'fondo_emergencia')
  const metasPropias = metas.filter((meta) => meta.tipo === 'meta')

  const enPositivo = calcularEnPositivo(excedente)
  const fondoLogrado = calcularFondoLogrado(metaFondo, enPositivo)
  const metasDesbloqueadas = fondoLogrado

  const mensajeBloqueoMetas = !enPositivo
    ? 'Primero necesitas pasar en positivo este mes'
    : 'Completa tu fondo de emergencia para desbloquear tus metas'
  // Versión corta para el encabezado contraído del acordeón, donde no cabe
  // el mensaje completo junto al título "Metas".
  const mensajeBloqueoMetasCorto = !enPositivo ? 'Primero, pasa en positivo' : 'Primero, tu fondo de emergencia'

  const logros = [
    ...(fondoLogrado && metaFondo ? [metaFondo] : []),
    ...metasPropias.filter(estaMetaLograda),
  ]

  return (
    <>
      <EncabezadoPagina
        titulo={`¡Hola${nombreUsuario ? `, ${nombreUsuario}` : ''}!`}
        descripcion="Cada peso en su lugar, un paso más tranquilo."
      />

      <AvisoRecordatorios />

      <div className="flex flex-col gap-5">
        <div className="overflow-hidden rounded-panel border border-border bg-surface divide-y divide-border">
          <FilaPasarPositivo
            excedente={excedente}
            abierta={abiertas.has('pasar_positivo')}
            onAlternar={() => alternar('pasar_positivo')}
          />

          {metaFondo && (
            <FilaFondoEmergencia
              meta={metaFondo}
              enPositivo={enPositivo}
              gastosMensuales={totalGastos}
              abierta={abiertas.has('fondo_emergencia')}
              onAlternar={() => alternar('fondo_emergencia')}
            />
          )}

          <FilaMetas
            metas={metasPropias}
            desbloqueada={metasDesbloqueadas}
            mensajeBloqueoCorto={mensajeBloqueoMetasCorto}
            mensajeBloqueo={mensajeBloqueoMetas}
            abierta={abiertas.has('meta')}
            onAlternar={() => alternar('meta')}
          />
        </div>

        <SeccionLogros logros={logros} />
      </div>
    </>
  )
}
