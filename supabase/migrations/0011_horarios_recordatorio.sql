-- =============================================================================
-- 0011_horarios_recordatorio.sql
-- Hasta 3 horas de aviso por recordatorio (ej. 8:00, 14:00, 20:00).
--
-- Esta etapa (9C-1) solo guarda el dato. El envío real de las notificaciones
-- (Web Push + Edge Function + cron) es 9C-2 y leerá esta tabla junto con
-- recordatorios.notificar, que sigue siendo el interruptor general: si está en
-- false no se envía nada, por muchos horarios que haya.
--
-- `hora` es `time` SIN zona y siempre se interpreta en America/Bogota.
-- Colombia no tiene horario de verano, así que no hay un desfase de una hora
-- dos veces al año y guardar la hora local es seguro.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Requisito previo: las FK compuestas (id, user_id) necesitan que las columnas
-- referenciadas tengan un índice único. `recordatorios` nació sin él (a
-- diferencia de ingresos, bolsillos y conceptos, ver 0004), así que se agrega
-- ahora. Es aditivo: no cambia ninguna fila existente.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'recordatorios_id_user_key'
  ) then
    alter table public.recordatorios
      add constraint recordatorios_id_user_key unique (id, user_id);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- horarios_recordatorio
--
-- El tope de 3 es DECLARATIVO, no un trigger: `orden` solo admite 0, 1 o 2 y
-- es único por recordatorio, así que la cuarta fila es imposible a nivel de
-- índice. Un trigger que contara filas tendría una carrera entre dos
-- inserciones simultáneas salvo que tomara un lock; esto no.
--
-- Ojo con el nombre: `orden` es una RANURA, no el orden de pantalla. Si se
-- borra el horario de la ranura 1 quedan la 0 y la 2, y el siguiente que se
-- agregue ocupa la libre más baja. La interfaz ordena por `hora`, que para
-- horas del día es lo natural.
-- -----------------------------------------------------------------------------
create table if not exists public.horarios_recordatorio (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  recordatorio_id uuid not null,
  hora            time not null,
  orden           smallint not null default 0 check (orden between 0 and 2),
  created_at      timestamptz not null default now(),
  constraint horarios_recordatorio_orden_key unique (recordatorio_id, orden),
  constraint horarios_recordatorio_hora_key  unique (recordatorio_id, hora),
  constraint horarios_recordatorio_fk
    foreign key (recordatorio_id, user_id)
    references public.recordatorios (id, user_id) on delete cascade
);

comment on table  public.horarios_recordatorio is
  'Horas del dia en que avisar un recordatorio. Maximo 3 por recordatorio.';
comment on column public.horarios_recordatorio.hora is
  'Hora local de Colombia (America/Bogota). Sin zona: Colombia no tiene horario de verano.';
comment on column public.horarios_recordatorio.orden is
  'Ranura 0, 1 o 2. Impone el tope de 3 junto con el unique; NO es el orden de pantalla (se ordena por hora).';

create index if not exists horarios_recordatorio_user_idx
  on public.horarios_recordatorio (user_id);
create index if not exists horarios_recordatorio_recordatorio_idx
  on public.horarios_recordatorio (recordatorio_id, hora);

-- -----------------------------------------------------------------------------
-- RLS: mismas 4 políticas que las demás tablas de usuario (ver 0006).
-- -----------------------------------------------------------------------------
alter table public.horarios_recordatorio enable row level security;

drop policy if exists horarios_recordatorio_select on public.horarios_recordatorio;
create policy horarios_recordatorio_select on public.horarios_recordatorio
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists horarios_recordatorio_insert on public.horarios_recordatorio;
create policy horarios_recordatorio_insert on public.horarios_recordatorio
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists horarios_recordatorio_update on public.horarios_recordatorio;
create policy horarios_recordatorio_update on public.horarios_recordatorio
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists horarios_recordatorio_delete on public.horarios_recordatorio;
create policy horarios_recordatorio_delete on public.horarios_recordatorio
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.horarios_recordatorio from anon;
grant select, insert, update, delete on public.horarios_recordatorio to authenticated;
