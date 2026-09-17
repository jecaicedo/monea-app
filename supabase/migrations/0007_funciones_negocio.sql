-- =============================================================================
-- 0007_funciones_negocio.sql
-- Lógica de negocio: cálculo del neto de un ingreso, inicialización del
-- presupuesto a partir de la plantilla, y creación automática del perfil.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- neto_ingreso(ingresos): neto de UN periodo de esa fuente de ingreso.
--
--   neto = monto_bruto
--        - salud   (salud_pct   % del bruto, redondeado al mil)
--        - pensión (pension_pct % del bruto, redondeado al mil)
--        + auxilio_transporte
--        - suma de deducciones_personalizadas del ingreso
--
-- La prima_anual NO entra aquí: es un ingreso extraordinario que se reporta
-- aparte para no inflar el presupuesto mensual.
--
-- El resultado está en la frecuencia del ingreso (mes o quincena). Para llevarlo
-- a mensual, envolver en normalizar_a_mensual(neto_ingreso(i), i.frecuencia),
-- que es justo lo que hace la vista v_resumen_presupuesto.
--
-- Recibe la fila completa, así que se puede usar como columna calculada:
--   select i.*, public.neto_ingreso(i) as neto from public.ingresos i;
-- -----------------------------------------------------------------------------
create or replace function public.neto_ingreso(ing public.ingresos)
returns numeric
language sql
stable
as $$
  select ing.monto_bruto
       - public.redondear_mil(ing.monto_bruto * ing.salud_pct   / 100)
       - public.redondear_mil(ing.monto_bruto * ing.pension_pct / 100)
       + ing.auxilio_transporte
       - coalesce((
           select sum(d.monto)
           from public.deducciones_personalizadas d
           where d.ingreso_id = ing.id
         ), 0);
$$;

comment on function public.neto_ingreso(public.ingresos) is
  'Neto de un periodo de la fuente de ingreso: bruto - salud - pension + auxilio - deducciones personalizadas.';

-- Variante por id, cómoda para llamar desde el cliente como RPC.
create or replace function public.neto_ingreso(p_ingreso_id uuid)
returns numeric
language sql
stable
as $$
  select public.neto_ingreso(i) from public.ingresos i where i.id = p_ingreso_id;
$$;

comment on function public.neto_ingreso(uuid) is
  'Igual que neto_ingreso(ingresos) pero recibiendo el id. Respeta RLS: solo ve ingresos propios.';

-- Verificación del caso real de referencia:
--   bruto 3.699.520, salud 4% + pension 4%, auxilio 0, sin deducciones -> 3.403.520
do $$
declare
  resultado numeric;
begin
  select public.neto_ingreso(
    jsonb_populate_record(
      null::public.ingresos,
      '{"monto_bruto": 3699520, "salud_pct": 4, "pension_pct": 4, "auxilio_transporte": 0}'::jsonb
    )
  ) into resultado;

  if resultado <> 3403520 then
    raise exception 'neto_ingreso devolvio % y se esperaba 3403520', resultado;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- inicializar_presupuesto(): copia la plantilla global al presupuesto del
-- usuario actual y crea sus dos metas base.
--
--   plantilla_grupos    -> bolsillos
--   plantilla_conceptos -> conceptos (monto 0, frecuencia 'mes')
--   metas base          -> 'pasar_positivo' (activa) y 'fondo_emergencia' (bloqueada)
--
-- Es segura de llamar varias veces: si el usuario ya tiene bolsillos, no hace
-- nada y devuelve ya_inicializado = true. El advisory lock evita que dos
-- llamadas simultáneas (doble clic, reintento del cliente) creen todo dos veces.
--
-- Corre como SECURITY INVOKER a propósito: todas las escrituras pasan por las
-- políticas RLS del usuario, así que la función no puede tocar datos ajenos.
-- -----------------------------------------------------------------------------
create or replace function public.inicializar_presupuesto()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid              uuid := auth.uid();
  n_bolsillos      integer := 0;
  n_conceptos      integer := 0;
  n_metas          integer := 0;
begin
  if uid is null then
    raise exception 'inicializar_presupuesto() requiere una sesion autenticada'
      using errcode = '28000';
  end if;

  -- Serializa las llamadas concurrentes del MISMO usuario hasta el commit.
  perform pg_advisory_xact_lock(hashtext('inicializar_presupuesto'), hashtext(uid::text));

  if exists (select 1 from public.bolsillos where user_id = uid) then
    return jsonb_build_object(
      'ya_inicializado', true,
      'bolsillos_creados', 0,
      'conceptos_creados', 0,
      'metas_creadas', 0
    );
  end if;

  -- 1) Bolsillos a partir de los grupos de la plantilla.
  insert into public.bolsillos (user_id, categoria_id, nombre, es_fondo_emergencia, orden)
  select uid, pg.categoria_id, pg.nombre, (pg.nombre = 'Fondo de emergencia'), pg.orden
  from public.plantilla_grupos pg;
  get diagnostics n_bolsillos = row_count;

  -- 2) Conceptos en monto 0. El join reconecta cada bolsillo recién creado con
  --    su grupo de plantilla por (categoria_id, nombre), que es único.
  insert into public.conceptos (user_id, bolsillo_id, nombre, monto, frecuencia, orden)
  select uid, b.id, pc.nombre, 0, 'mes', pc.orden
  from public.bolsillos b
  join public.plantilla_grupos pg
    on pg.categoria_id = b.categoria_id and pg.nombre = b.nombre
  join public.plantilla_conceptos pc
    on pc.plantilla_grupo_id = pg.id
  where b.user_id = uid;
  get diagnostics n_conceptos = row_count;

  -- 3) Metas base. 'pasar_positivo' arranca activa; el fondo de emergencia
  --    queda bloqueado hasta que el usuario logre la primera (gamificación).
  insert into public.metas (user_id, tipo, nombre, monto_objetivo, estado, orden)
  values
    (uid, 'pasar_positivo',   'Pasar a positivo',    0, 'activa',     1),
    (uid, 'fondo_emergencia', 'Fondo de emergencia', 0, 'bloqueada',  2)
  on conflict (user_id, tipo)
    where tipo in ('pasar_positivo', 'fondo_emergencia')
    do nothing;
  get diagnostics n_metas = row_count;

  return jsonb_build_object(
    'ya_inicializado', false,
    'bolsillos_creados', n_bolsillos,
    'conceptos_creados', n_conceptos,
    'metas_creadas', n_metas
  );
end;
$$;

comment on function public.inicializar_presupuesto() is
  'RPC: copia la plantilla global (grupos y conceptos) al presupuesto del usuario actual y crea sus metas base. Idempotente.';

revoke all on function public.inicializar_presupuesto() from public;
grant execute on function public.inicializar_presupuesto() to authenticated;

-- -----------------------------------------------------------------------------
-- manejar_nuevo_usuario(): trigger sobre auth.users que crea el perfil.
-- Es SECURITY DEFINER porque corre dentro de la transacción de registro de
-- Supabase Auth, donde todavía no hay auth.uid() para pasar las políticas RLS.
-- Toma el nombre de los metadatos del registro si el cliente los envió.
-- -----------------------------------------------------------------------------
create or replace function public.manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'nombre', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.manejar_nuevo_usuario() is
  'Trigger AFTER INSERT sobre auth.users: crea la fila correspondiente en public.perfiles.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.manejar_nuevo_usuario();

-- Backfill: perfiles para las cuentas que ya existían antes de este trigger.
insert into public.perfiles (id, nombre)
select u.id, split_part(coalesce(u.email, ''), '@', 1)
from auth.users u
on conflict (id) do nothing;
