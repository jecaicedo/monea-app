-- =============================================================================
-- 0003_catalogos.sql
-- Tablas de catálogo: son globales (no pertenecen a ningún usuario), de solo
-- lectura para los clientes, y sirven como plantilla para inicializar el
-- presupuesto de cada usuario nuevo.
-- Las políticas de lectura se definen en 0006_rls.sql y los datos en 0005.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- categorias: las 6 categorías fijas del método de presupuesto. El
-- porcentaje_ideal indica qué parte del ingreso neto debería ir a cada una
-- (suma 100). El color se usa en las gráficas del frontend.
-- -----------------------------------------------------------------------------
create table if not exists public.categorias (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  slug             text not null unique,
  porcentaje_ideal numeric(5,2) not null check (porcentaje_ideal >= 0 and porcentaje_ideal <= 100),
  color            text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  orden            smallint not null default 0,
  created_at       timestamptz not null default now()
);

comment on table  public.categorias is
  'Catalogo global: las 6 categorias fijas del presupuesto con su porcentaje ideal y color.';
comment on column public.categorias.slug is
  'Identificador estable usado por el frontend y por las vistas de resumen.';
comment on column public.categorias.porcentaje_ideal is
  'Porcentaje del ingreso neto que idealmente corresponde a esta categoria (0-100).';
comment on column public.categorias.color is
  'Color hexadecimal #RRGGBB usado en graficas y bolsillos.';

create index if not exists categorias_orden_idx on public.categorias (orden);

-- -----------------------------------------------------------------------------
-- plantilla_grupos: los "bolsillos" sugeridos dentro de cada categoría. Se
-- copian a public.bolsillos cuando el usuario ejecuta inicializar_presupuesto().
-- -----------------------------------------------------------------------------
create table if not exists public.plantilla_grupos (
  id           uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias (id) on delete cascade,
  nombre       text not null,
  orden        smallint not null default 0,
  created_at   timestamptz not null default now(),
  constraint plantilla_grupos_categoria_nombre_key unique (categoria_id, nombre)
);

comment on table public.plantilla_grupos is
  'Catalogo global: grupos (bolsillos) sugeridos por categoria. Semilla de public.bolsillos.';

create index if not exists plantilla_grupos_categoria_idx
  on public.plantilla_grupos (categoria_id, orden);

-- -----------------------------------------------------------------------------
-- plantilla_conceptos: las líneas de gasto sugeridas dentro de cada grupo. Se
-- copian a public.conceptos con monto 0 al inicializar el presupuesto.
-- -----------------------------------------------------------------------------
create table if not exists public.plantilla_conceptos (
  id                  uuid primary key default gen_random_uuid(),
  plantilla_grupo_id  uuid not null references public.plantilla_grupos (id) on delete cascade,
  nombre              text not null,
  orden               smallint not null default 0,
  created_at          timestamptz not null default now(),
  constraint plantilla_conceptos_grupo_nombre_key unique (plantilla_grupo_id, nombre)
);

comment on table public.plantilla_conceptos is
  'Catalogo global: conceptos (lineas de gasto) sugeridos por grupo. Semilla de public.conceptos.';

create index if not exists plantilla_conceptos_grupo_idx
  on public.plantilla_conceptos (plantilla_grupo_id, orden);
