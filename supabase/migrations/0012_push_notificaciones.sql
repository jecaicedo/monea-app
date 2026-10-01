-- =============================================================================
-- 0012_push_notificaciones.sql
-- Web Push para los recordatorios (9C-2).
--
-- Tres piezas:
--   push_subscripciones   los navegadores a los que hay que avisarle
--   envios_notificacion   qué avisos ya salieron (idempotencia del cron)
--   ocurre_en_fecha()     si un recordatorio cae en un día dado
--
-- La Edge Function `enviar-notificaciones-recordatorios` corre cada 10 minutos
-- y usa las tres.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- push_subscripciones: una fila por navegador/dispositivo suscrito.
--
-- endpoint, p256dh y auth son exactamente lo que devuelve
-- PushManager.subscribe() en el navegador; no los inventamos nosotros.
--
-- `endpoint` es único a secas (no por usuario): un mismo navegador no puede
-- estar suscrito dos veces, ni siquiera para dos cuentas distintas. Si alguien
-- cierra sesión y entra con otra, el upsert por endpoint reasigna la fila al
-- nuevo dueño, que es justo lo que se quiere: el aparato es uno solo.
-- -----------------------------------------------------------------------------
create table if not exists public.push_subscripciones (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table  public.push_subscripciones is
  'Suscripciones Web Push del usuario. Una por navegador/dispositivo.';
comment on column public.push_subscripciones.endpoint is
  'URL del servicio push del navegador. Unica: identifica al aparato.';

create index if not exists push_subscripciones_user_idx
  on public.push_subscripciones (user_id);

drop trigger if exists push_subscripciones_set_updated_at on public.push_subscripciones;
create trigger push_subscripciones_set_updated_at
  before update on public.push_subscripciones
  for each row execute function public.set_updated_at();

alter table public.push_subscripciones enable row level security;

drop policy if exists push_subscripciones_select on public.push_subscripciones;
create policy push_subscripciones_select on public.push_subscripciones
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists push_subscripciones_insert on public.push_subscripciones;
create policy push_subscripciones_insert on public.push_subscripciones
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists push_subscripciones_update on public.push_subscripciones;
create policy push_subscripciones_update on public.push_subscripciones
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists push_subscripciones_delete on public.push_subscripciones;
create policy push_subscripciones_delete on public.push_subscripciones
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.push_subscripciones from anon;
grant select, insert, update, delete on public.push_subscripciones to authenticated;

-- -----------------------------------------------------------------------------
-- envios_notificacion: la marca de "este aviso ya salió".
--
-- La clave de idempotencia es (horario_id, fecha): un horario concreto se avisa
-- UNA vez por día. La Edge Function inserta ANTES de enviar, con
-- `on conflict do nothing`; si no insertó nada es que otra ejecución ya tomó
-- ese aviso y se lo salta. La exclusión la da el índice único, no una
-- comprobación previa — así dos ejecuciones simultáneas (cron solapado,
-- reintento tras timeout, invocación manual) no pueden duplicar el envío.
--
-- No la toca ningún usuario: solo la Edge Function con service_role, que hace
-- bypass de RLS. Por eso RLS queda activo SIN políticas y sin grants: desde el
-- cliente la tabla es invisible.
-- -----------------------------------------------------------------------------
create table if not exists public.envios_notificacion (
  id         uuid primary key default gen_random_uuid(),
  horario_id uuid not null references public.horarios_recordatorio (id) on delete cascade,
  fecha      date not null,
  enviado_at timestamptz not null default now(),
  constraint envios_notificacion_horario_fecha_key unique (horario_id, fecha)
);

comment on table public.envios_notificacion is
  'Marca de idempotencia del cron: un horario se avisa una sola vez por dia. Solo la escribe la Edge Function.';

create index if not exists envios_notificacion_fecha_idx
  on public.envios_notificacion (fecha);

alter table public.envios_notificacion enable row level security;
revoke all on public.envios_notificacion from anon, authenticated;

-- -----------------------------------------------------------------------------
-- ocurre_en_fecha(fecha_base, recurrencia, dia): ¿este recordatorio cae en `dia`?
--
-- Existe en SQL y no en la Edge Function a propósito. El equivalente de
-- `src/lib/recordatorios.ts` usa la zona horaria del navegador; la función
-- corre en UTC y cerca de medianoche calcularía mal el "hoy" de Bogotá. Aquí
-- el día llega ya resuelto por quien llama y la aritmética queda en un solo
-- sitio, comprobable con un `select` suelto.
--
-- El `clamp` de fin de mes replica el de sumarMeses(): un recordatorio del 31
-- cae el 28 (o 29) en febrero, no se salta el mes.
-- -----------------------------------------------------------------------------
create or replace function public.ocurre_en_fecha(
  p_fecha_base date,
  p_recurrencia text,
  p_dia date
)
returns boolean
language sql
immutable
as $$
  select case
    -- Sin recurrencia: ocurre exactamente una vez, el día que se guardó.
    when p_recurrencia is null then p_fecha_base = p_dia

    when p_recurrencia = 'diaria' then p_dia >= p_fecha_base

    when p_recurrencia in ('semanal', 'quincenal') then
      p_dia >= p_fecha_base
      and (p_dia - p_fecha_base) % (case p_recurrencia when 'semanal' then 7 else 15 end) = 0

    when p_recurrencia in ('mensual', 'bimestral', 'trimestral', 'semestral', 'anual') then
      p_dia >= p_fecha_base
      -- Los meses transcurridos tienen que ser múltiplo del paso...
      and (
        (extract(year from p_dia) - extract(year from p_fecha_base)) * 12
        + (extract(month from p_dia) - extract(month from p_fecha_base))
      )::int % (case p_recurrencia
                  when 'mensual'    then 1
                  when 'bimestral'  then 2
                  when 'trimestral' then 3
                  when 'semestral'  then 6
                  else 12
                end) = 0
      -- ...y el día tiene que coincidir, salvo que el mes se quede corto: ahí
      -- cae el último día (31 de enero -> 28 de febrero).
      and extract(day from p_dia) = least(
        extract(day from p_fecha_base),
        extract(day from (date_trunc('month', p_dia) + interval '1 month - 1 day'))
      )

    else false
  end;
$$;

comment on function public.ocurre_en_fecha(date, text, date) is
  'True si un recordatorio con esa fecha base y recurrencia cae en p_dia. Replica la logica de src/lib/recordatorios.ts, incluido el clamp de fin de mes.';

-- -----------------------------------------------------------------------------
-- horarios_pendientes(fecha, desde, hasta): qué avisos toca mandar ahora.
--
-- La Edge Function la llama con la ventana del cron ya calculada en hora de
-- Bogotá. Toda la lógica de fechas vive de este lado; allá no hay aritmética
-- de calendario a propósito.
--
-- La ventana es [desde, hasta): cada borde pertenece a exactamente una
-- corrida, así que un horario no se puede avisar dos veces ni caerse entre dos
-- ventanas. Un horario justo en `hasta` entra en la corrida siguiente, con lo
-- que el aviso llega hasta 10 minutos tarde — dentro del margen de 5 a 15
-- minutos que anuncia la interfaz.
--
-- Solo la usa la Edge Function (service_role), así que no se expone a
-- `authenticated`.
-- -----------------------------------------------------------------------------
create or replace function public.horarios_pendientes(
  p_fecha date,
  p_desde time,
  p_hasta time
)
returns table (
  horario_id uuid,
  user_id    uuid,
  hora       time,
  titulo     text,
  tipo       text
)
language sql
stable
set search_path = public
as $$
  select h.id, h.user_id, h.hora, r.titulo, r.tipo
  from public.horarios_recordatorio h
  join public.recordatorios r
    on r.id = h.recordatorio_id and r.user_id = h.user_id
  where r.notificar
    and h.hora >= p_desde
    and h.hora <  p_hasta
    and public.ocurre_en_fecha(r.fecha, r.recurrencia, p_fecha);
$$;

comment on function public.horarios_pendientes(date, time, time) is
  'Avisos que caen en la ventana [desde, hasta) del dia p_fecha. La llama la Edge Function del cron.';

revoke all on function public.horarios_pendientes(date, time, time) from public, anon, authenticated;

-- Verificación: si la aritmética se rompe, la migración falla aquí y no deja
-- el cron enviando avisos en los días equivocados.
do $$
begin
  -- Una vez: solo su propio día.
  if not public.ocurre_en_fecha('2026-10-15', null, '2026-10-15') then
    raise exception 'ocurre_en_fecha: una vez deberia caer en su propia fecha';
  end if;
  if public.ocurre_en_fecha('2026-10-15', null, '2026-11-15') then
    raise exception 'ocurre_en_fecha: una vez no deberia repetirse';
  end if;

  -- Mensual: mismo día de cada mes.
  if not public.ocurre_en_fecha('2026-10-15', 'mensual', '2026-12-15') then
    raise exception 'ocurre_en_fecha: mensual deberia caer el 15 de diciembre';
  end if;
  if public.ocurre_en_fecha('2026-10-15', 'mensual', '2026-12-16') then
    raise exception 'ocurre_en_fecha: mensual no deberia caer el 16';
  end if;

  -- Clamp: un recordatorio del 31 cae el 28 en febrero de un año no bisiesto.
  if not public.ocurre_en_fecha('2026-01-31', 'mensual', '2026-02-28') then
    raise exception 'ocurre_en_fecha: el 31 deberia caer el 28 de febrero';
  end if;
  -- Y en un mes de 31 días vuelve a su día, no se queda en el 30.
  if public.ocurre_en_fecha('2026-01-31', 'mensual', '2026-03-30') then
    raise exception 'ocurre_en_fecha: el 31 no deberia caer el 30 de marzo';
  end if;
  if not public.ocurre_en_fecha('2026-01-31', 'mensual', '2026-03-31') then
    raise exception 'ocurre_en_fecha: el 31 deberia caer el 31 de marzo';
  end if;

  -- Anual: mismo día y mes, no antes de la fecha base.
  if not public.ocurre_en_fecha('2026-10-15', 'anual', '2027-10-15') then
    raise exception 'ocurre_en_fecha: anual deberia caer un anio despues';
  end if;
  if public.ocurre_en_fecha('2026-10-15', 'anual', '2025-10-15') then
    raise exception 'ocurre_en_fecha: nada ocurre antes de su fecha base';
  end if;
end;
$$;
