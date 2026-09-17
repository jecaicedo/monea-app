-- =============================================================================
-- 0004_tablas_usuario.sql
-- Tablas que contienen datos privados de cada usuario. Todas llevan user_id,
-- created_at, updated_at y un trigger que refresca updated_at.
-- El aislamiento entre usuarios se define en 0006_rls.sql.
--
-- Nota de diseño: las llaves foráneas entre tablas de usuario son COMPUESTAS
-- (id, user_id). Eso impide que un usuario cree una fila que apunte a un
-- registro de otro usuario, algo que las políticas RLS por sí solas no evitan.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- perfiles: una fila por usuario autenticado. Se crea automáticamente con el
-- trigger sobre auth.users definido en 0007_funciones_negocio.sql.
-- -----------------------------------------------------------------------------
create table if not exists public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text,
  tema       text not null default 'oscuro' check (tema in ('oscuro', 'claro', 'sistema')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table  public.perfiles is
  'Datos de perfil del usuario. El id es igual a auth.uid().';
comment on column public.perfiles.tema is
  'Preferencia visual de la PWA: oscuro (default), claro o sistema.';

-- -----------------------------------------------------------------------------
-- ingresos: fuentes de ingreso del usuario (un empleo, un negocio, etc.).
-- El neto se calcula con public.neto_ingreso() (ver 0007).
-- -----------------------------------------------------------------------------
create table if not exists public.ingresos (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  nombre             text not null,
  monto_bruto        numeric(14,2) not null default 0 check (monto_bruto >= 0),
  moneda             text not null default 'COP' check (char_length(moneda) = 3),
  es_mensual         boolean not null default true,
  frecuencia         text not null default 'mes' check (frecuencia in ('mes', 'quincena')),
  banco              text,
  salud_pct          numeric(5,2) not null default 4 check (salud_pct >= 0 and salud_pct <= 100),
  pension_pct        numeric(5,2) not null default 4 check (pension_pct >= 0 and pension_pct <= 100),
  auxilio_transporte numeric(14,2) not null default 0 check (auxilio_transporte >= 0),
  prima_anual        numeric(14,2) not null default 0 check (prima_anual >= 0),
  orden              smallint not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint ingresos_id_user_key unique (id, user_id)
);

comment on table  public.ingresos is
  'Fuentes de ingreso del usuario con sus parametros de liquidacion (salud, pension, auxilio, prima).';
comment on column public.ingresos.monto_bruto is
  'Monto bruto por periodo, expresado en la frecuencia de la columna frecuencia.';
comment on column public.ingresos.es_mensual is
  'Derivada de frecuencia (true si frecuencia = mes). La sincroniza un trigger.';
comment on column public.ingresos.prima_anual is
  'Prima de servicios anual. No entra al neto mensual; se reporta aparte.';

create index if not exists ingresos_user_idx on public.ingresos (user_id, orden);

-- ingresos.es_mensual siempre debe reflejar ingresos.frecuencia; el frontend
-- puede enviar solo una de las dos y el trigger reconcilia la otra.
create or replace function public.sincronizar_frecuencia_ingreso()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and new.frecuencia is not distinct from old.frecuencia
     and new.es_mensual is distinct from old.es_mensual then
    -- El cliente cambio es_mensual y no la frecuencia: mandan los booleanos.
    new.frecuencia := case when new.es_mensual then 'mes' else 'quincena' end;
  else
    new.es_mensual := (new.frecuencia = 'mes');
  end if;
  return new;
end;
$$;

comment on function public.sincronizar_frecuencia_ingreso() is
  'Mantiene coherentes ingresos.frecuencia e ingresos.es_mensual.';

drop trigger if exists ingresos_sincronizar_frecuencia on public.ingresos;
create trigger ingresos_sincronizar_frecuencia
  before insert or update on public.ingresos
  for each row execute function public.sincronizar_frecuencia_ingreso();

-- -----------------------------------------------------------------------------
-- deducciones_personalizadas: descuentos fijos que el usuario agrega sobre un
-- ingreso (libranzas, fondo de empleados, embargos, etc.).
-- -----------------------------------------------------------------------------
create table if not exists public.deducciones_personalizadas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  ingreso_id uuid not null,
  nombre     text not null,
  monto      numeric(14,2) not null default 0 check (monto >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deducciones_ingreso_fk
    foreign key (ingreso_id, user_id)
    references public.ingresos (id, user_id) on delete cascade
);

comment on table public.deducciones_personalizadas is
  'Descuentos adicionales aplicados a un ingreso (libranzas, fondo de empleados, etc.).';

create index if not exists deducciones_user_idx    on public.deducciones_personalizadas (user_id);
create index if not exists deducciones_ingreso_idx on public.deducciones_personalizadas (ingreso_id);

-- -----------------------------------------------------------------------------
-- bolsillos: los grupos de gasto/ahorro del usuario dentro de una categoría.
-- Copia personalizable de plantilla_grupos.
-- -----------------------------------------------------------------------------
create table if not exists public.bolsillos (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  categoria_id        uuid not null references public.categorias (id) on delete restrict,
  nombre              text not null,
  banco               text,
  es_fondo_emergencia boolean not null default false,
  orden               smallint not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint bolsillos_id_user_key unique (id, user_id)
);

comment on table  public.bolsillos is
  'Grupos de gasto o ahorro del usuario dentro de una categoria (en la app: bolsillos).';
comment on column public.bolsillos.banco is
  'Banco donde vive el dinero de este bolsillo (solo relevante en bolsillos de ahorro).';
comment on column public.bolsillos.es_fondo_emergencia is
  'Marca el bolsillo que alimenta la meta base de fondo de emergencia.';

create index if not exists bolsillos_user_idx      on public.bolsillos (user_id, orden);
create index if not exists bolsillos_categoria_idx on public.bolsillos (user_id, categoria_id);

-- -----------------------------------------------------------------------------
-- conceptos: cada línea de gasto dentro de un bolsillo, con su monto y su
-- frecuencia. El equivalente mensual sale de normalizar_a_mensual().
-- -----------------------------------------------------------------------------
create table if not exists public.conceptos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  bolsillo_id uuid not null,
  nombre      text not null,
  monto       numeric(14,2) not null default 0 check (monto >= 0),
  frecuencia  text not null default 'mes'
              check (frecuencia in ('dia','semana','quincena','mes','bimestre','trimestre','semestre','anio')),
  nota        text,
  orden       smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint conceptos_id_user_key unique (id, user_id),
  constraint conceptos_bolsillo_fk
    foreign key (bolsillo_id, user_id)
    references public.bolsillos (id, user_id) on delete cascade
);

comment on table  public.conceptos is
  'Lineas de gasto dentro de un bolsillo, con monto y frecuencia normalizable a mensual.';
comment on column public.conceptos.frecuencia is
  'dia, semana, quincena, mes, bimestre, trimestre, semestre o anio (= año, sin ñ para evitar problemas de codificacion en el cliente).';

create index if not exists conceptos_user_idx     on public.conceptos (user_id);
create index if not exists conceptos_bolsillo_idx on public.conceptos (bolsillo_id, orden);

-- -----------------------------------------------------------------------------
-- metas: metas gamificadas. Hay dos metas base creadas al inicializar
-- ('pasar_positivo' y 'fondo_emergencia') y las demás las crea el usuario.
-- -----------------------------------------------------------------------------
create table if not exists public.metas (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  tipo           text not null check (tipo in ('pasar_positivo', 'fondo_emergencia', 'meta')),
  nombre         text not null,
  monto_objetivo numeric(14,2) not null default 0 check (monto_objetivo >= 0),
  monto_actual   numeric(14,2) not null default 0 check (monto_actual >= 0),
  banco          text,
  estado         text not null default 'bloqueada' check (estado in ('bloqueada', 'activa', 'lograda')),
  fecha_lograda  timestamptz,
  orden          smallint not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint metas_lograda_con_fecha
    check (estado <> 'lograda' or fecha_lograda is not null)
);

comment on table  public.metas is
  'Metas gamificadas del usuario. Los tipos pasar_positivo y fondo_emergencia son metas base unicas.';
comment on column public.metas.estado is
  'bloqueada (aun no disponible), activa (en progreso) o lograda.';

create index if not exists metas_user_idx on public.metas (user_id, orden);

-- Solo puede existir UNA meta base de cada tipo por usuario; las metas libres
-- (tipo 'meta') no tienen ese límite.
create unique index if not exists metas_base_unicas_idx
  on public.metas (user_id, tipo)
  where tipo in ('pasar_positivo', 'fondo_emergencia');

-- -----------------------------------------------------------------------------
-- distribuciones: reparte el monto de un concepto entre varias fuentes de
-- ingreso ("este arriendo lo pago 60% con un ingreso y 40% con el otro").
-- -----------------------------------------------------------------------------
create table if not exists public.distribuciones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  concepto_id uuid not null,
  ingreso_id  uuid not null,
  monto       numeric(14,2) not null default 0 check (monto >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint distribuciones_concepto_ingreso_key unique (concepto_id, ingreso_id),
  constraint distribuciones_concepto_fk
    foreign key (concepto_id, user_id)
    references public.conceptos (id, user_id) on delete cascade,
  constraint distribuciones_ingreso_fk
    foreign key (ingreso_id, user_id)
    references public.ingresos (id, user_id) on delete cascade
);

comment on table public.distribuciones is
  'Reparto del monto de un concepto entre las distintas fuentes de ingreso del usuario.';

create index if not exists distribuciones_user_idx     on public.distribuciones (user_id);
create index if not exists distribuciones_concepto_idx on public.distribuciones (concepto_id);
create index if not exists distribuciones_ingreso_idx  on public.distribuciones (ingreso_id);

-- -----------------------------------------------------------------------------
-- antojos: lista de deseos. Sirve para el ejercicio de "esperar antes de
-- comprar" y para contrastar el precio contra el excedente del mes.
-- -----------------------------------------------------------------------------
create table if not exists public.antojos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  nombre     text not null,
  precio     numeric(14,2) not null default 0 check (precio >= 0),
  foto_path  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table  public.antojos is
  'Lista de antojos o deseos de compra del usuario.';
comment on column public.antojos.foto_path is
  'Ruta del archivo en Supabase Storage (bucket privado), no una URL publica.';

create index if not exists antojos_user_idx on public.antojos (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- recordatorios: avisos de pagos, cortes de tarjeta, cumpleaños, pico y placa.
-- -----------------------------------------------------------------------------
create table if not exists public.recordatorios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  tipo        text not null check (tipo in ('pago', 'tarjeta', 'cumpleanos', 'pico_y_placa', 'otro')),
  titulo      text not null,
  fecha       date not null,
  recurrencia text check (recurrencia in ('diaria','semanal','quincenal','mensual','bimestral','trimestral','semestral','anual')),
  notificar   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.recordatorios is
  'Recordatorios del usuario: pagos, cortes de tarjeta, cumpleanos, pico y placa y otros.';
comment on column public.recordatorios.recurrencia is
  'NULL = evento de una sola vez. En caso contrario indica cada cuanto se repite.';

create index if not exists recordatorios_user_fecha_idx on public.recordatorios (user_id, fecha);

-- -----------------------------------------------------------------------------
-- Triggers de updated_at para todas las tablas de usuario.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'perfiles', 'ingresos', 'deducciones_personalizadas', 'bolsillos',
    'conceptos', 'metas', 'distribuciones', 'antojos', 'recordatorios'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;
