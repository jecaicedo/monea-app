-- =============================================================================
-- 0010_seguimiento_mensual.sql
-- "Mes a mes": registro de si los conceptos PROYECTADOS del presupuesto se
-- cumplieron realmente cada mes.
--
-- Nota de diseño: este sistema es PARALELO al presupuesto, no parte de él.
-- Comparte la lista de conceptos como referencia y nada más: ni Revisa, ni el
-- diagnóstico, ni las metas leen esta tabla. Sus cálculos siguen saliendo 100%
-- de public.conceptos (la proyección), nunca de lo efectivamente pagado.
--
-- monto_presupuestado es una COPIA congelada del monto mensual del concepto en
-- el momento en que se creó la fila del mes. No se recalcula nunca, ni siquiera
-- durante el mes en curso: si el usuario corrige el presupuesto a mitad de mes,
-- la comparación "planeaste X, pagaste Y" sigue siendo la interesante.
-- =============================================================================

create table if not exists public.seguimiento_mensual (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  concepto_id         uuid not null,
  anio                smallint not null check (anio between 2000 and 2100),
  mes                 smallint not null check (mes between 1 and 12),
  monto_presupuestado numeric(14,2) not null default 0 check (monto_presupuestado >= 0),
  monto_pagado        numeric(14,2) check (monto_pagado >= 0),
  cumplido            boolean,
  nota                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint seguimiento_concepto_mes_key unique (user_id, concepto_id, anio, mes),
  -- FK COMPUESTA, igual que el resto de relaciones entre tablas de usuario:
  -- impide colgar seguimiento del concepto de otra persona, algo que las
  -- políticas RLS por sí solas no evitan (ver 0004 y backend.md §2).
  constraint seguimiento_concepto_fk
    foreign key (concepto_id, user_id)
    references public.conceptos (id, user_id) on delete cascade
);

comment on table  public.seguimiento_mensual is
  'Foto mensual del cumplimiento de cada concepto del presupuesto. Un registro por concepto por mes.';
comment on column public.seguimiento_mensual.monto_presupuestado is
  'Monto mensual del concepto copiado al crear la fila. Congelado: no se recalcula aunque cambie el presupuesto.';
comment on column public.seguimiento_mensual.cumplido is
  'NULL = pendiente de marcar, true = se pago, false = no se pago.';
comment on column public.seguimiento_mensual.monto_pagado is
  'Lo efectivamente pagado. NULL mientras el usuario no lo capture.';

create index if not exists seguimiento_user_periodo_idx
  on public.seguimiento_mensual (user_id, anio, mes);
create index if not exists seguimiento_concepto_idx
  on public.seguimiento_mensual (concepto_id);

drop trigger if exists seguimiento_mensual_set_updated_at on public.seguimiento_mensual;
create trigger seguimiento_mensual_set_updated_at
  before update on public.seguimiento_mensual
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: mismas 4 políticas que las demás tablas de usuario (ver 0006).
-- -----------------------------------------------------------------------------
alter table public.seguimiento_mensual enable row level security;

drop policy if exists seguimiento_mensual_select on public.seguimiento_mensual;
create policy seguimiento_mensual_select on public.seguimiento_mensual
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists seguimiento_mensual_insert on public.seguimiento_mensual;
create policy seguimiento_mensual_insert on public.seguimiento_mensual
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists seguimiento_mensual_update on public.seguimiento_mensual;
create policy seguimiento_mensual_update on public.seguimiento_mensual
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists seguimiento_mensual_delete on public.seguimiento_mensual;
create policy seguimiento_mensual_delete on public.seguimiento_mensual
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.seguimiento_mensual from anon;
grant select, insert, update, delete on public.seguimiento_mensual to authenticated;

-- -----------------------------------------------------------------------------
-- inicializar_seguimiento_mes(anio, mes): crea las filas que falten del mes.
--
-- Cubre DOS casos del mismo modo, porque son la misma consulta:
--   1. Arranque de mes: el mes no tiene ninguna fila todavía.
--   2. Concepto agregado a mitad de mes en Revisa: le falta su fila.
-- El "on conflict do nothing" la hace idempotente, así que el cliente puede
-- llamarla cada vez que entra a la pantalla sin revisar nada antes.
--
-- Solo entran los conceptos con monto mensual > 0, el mismo criterio que usa el
-- modal de detalle de categoría. No existe una marca de "concepto activo" en
-- public.conceptos, así que "activo" es exactamente eso: que tenga monto.
--
-- SOLO crea filas para el MES EN CURSO. Un mes pasado sin registros se queda
-- vacío a propósito: llenarlo ahora sería inventar historia, porque copiaría el
-- presupuesto de HOY a un mes que se vivió con otro presupuesto (o sin
-- ninguno). Y un mes futuro todavía no llega. Por eso navegar el historial no
-- genera datos: solo los lee.
--
-- SECURITY INVOKER a propósito: todas las escrituras pasan por las políticas
-- RLS del usuario, igual que inicializar_presupuesto().
-- -----------------------------------------------------------------------------
create or replace function public.inicializar_seguimiento_mes(p_anio integer, p_mes integer)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid         uuid := auth.uid();
  n_creadas   integer := 0;
  primero_mes date;
begin
  if uid is null then
    raise exception 'inicializar_seguimiento_mes() requiere una sesion autenticada'
      using errcode = '28000';
  end if;

  if p_mes < 1 or p_mes > 12 then
    raise exception 'mes invalido: %', p_mes using errcode = '22023';
  end if;

  -- Cualquier mes que no sea el actual se consulta, no se siembra.
  primero_mes := make_date(p_anio, p_mes, 1);
  if primero_mes <> date_trunc('month', current_date)::date then
    return jsonb_build_object('creadas', 0, 'es_mes_actual', false);
  end if;

  -- Serializa las llamadas concurrentes del MISMO usuario y mes (dos pestañas
  -- abiertas, doble montaje de StrictMode) hasta el commit.
  perform pg_advisory_xact_lock(hashtext('seguimiento_mensual'), hashtext(uid::text || p_anio || '-' || p_mes));

  insert into public.seguimiento_mensual (user_id, concepto_id, anio, mes, monto_presupuestado)
  select uid, c.id, p_anio, p_mes, public.normalizar_a_mensual(c.monto, c.frecuencia)
  from public.conceptos c
  where c.user_id = uid
    and public.normalizar_a_mensual(c.monto, c.frecuencia) > 0
  on conflict (user_id, concepto_id, anio, mes) do nothing;

  get diagnostics n_creadas = row_count;

  return jsonb_build_object('creadas', n_creadas, 'es_mes_actual', true);
end;
$$;

comment on function public.inicializar_seguimiento_mes(integer, integer) is
  'RPC: crea las filas de seguimiento que falten para el mes EN CURSO (arranque de mes y conceptos nuevos). Idempotente. En cualquier otro mes no escribe nada.';

revoke all on function public.inicializar_seguimiento_mes(integer, integer) from public;
grant execute on function public.inicializar_seguimiento_mes(integer, integer) to authenticated;
