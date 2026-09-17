-- =============================================================================
-- 0006_rls.sql
-- Row Level Security para todo el esquema public.
--
-- Reglas:
--   * Catálogos (categorias, plantilla_grupos, plantilla_conceptos):
--     RLS activo, SELECT para cualquier usuario autenticado, sin escritura.
--     Solo el service_role (que hace bypass de RLS) puede modificarlos.
--   * Tablas de usuario: el usuario ve y modifica únicamente las filas donde
--     user_id = auth.uid() (en perfiles, donde id = auth.uid()).
--
-- Nota: cada política se declara por comando (select/insert/update/delete) para
-- que sea explícito qué se permite. En UPDATE se usan USING y WITH CHECK, de
-- modo que un usuario tampoco pueda "regalarle" una fila suya a otro user_id.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Catálogos: solo lectura para autenticados.
-- -----------------------------------------------------------------------------
alter table public.categorias          enable row level security;
alter table public.plantilla_grupos    enable row level security;
alter table public.plantilla_conceptos enable row level security;

drop policy if exists categorias_select on public.categorias;
create policy categorias_select on public.categorias
  for select to authenticated using (true);

drop policy if exists plantilla_grupos_select on public.plantilla_grupos;
create policy plantilla_grupos_select on public.plantilla_grupos
  for select to authenticated using (true);

drop policy if exists plantilla_conceptos_select on public.plantilla_conceptos;
create policy plantilla_conceptos_select on public.plantilla_conceptos
  for select to authenticated using (true);

-- -----------------------------------------------------------------------------
-- perfiles: la fila propia, identificada por id (no por user_id).
-- No hay política de INSERT ni de DELETE: la fila la crea el trigger sobre
-- auth.users y desaparece por CASCADE cuando se borra la cuenta.
-- -----------------------------------------------------------------------------
alter table public.perfiles enable row level security;

drop policy if exists perfiles_select on public.perfiles;
create policy perfiles_select on public.perfiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists perfiles_update on public.perfiles;
create policy perfiles_update on public.perfiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- -----------------------------------------------------------------------------
-- Tablas de usuario con columna user_id: CRUD completo sobre las filas propias.
-- Se generan en bucle para que todas queden exactamente con la misma regla.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'ingresos', 'deducciones_personalizadas', 'bolsillos', 'conceptos',
    'metas', 'distribuciones', 'antojos', 'recordatorios'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using ((select auth.uid()) = user_id)', t || '_select', t);

    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check ((select auth.uid()) = user_id)', t || '_insert', t);

    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t || '_update', t);

    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using ((select auth.uid()) = user_id)', t || '_delete', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos de tabla. RLS filtra filas, pero GRANT decide si el rol puede tocar
-- la tabla siquiera: el rol anon no tiene acceso a nada de esta app.
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;

grant select on
  public.categorias, public.plantilla_grupos, public.plantilla_conceptos
  to authenticated;

grant select, update on public.perfiles to authenticated;

grant select, insert, update, delete on
  public.ingresos, public.deducciones_personalizadas, public.bolsillos,
  public.conceptos, public.metas, public.distribuciones, public.antojos,
  public.recordatorios
  to authenticated;
