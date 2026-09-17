-- =============================================================================
-- 0005_semilla_catalogos.sql
-- Datos semilla de los catálogos globales: las 6 categorías fijas y la
-- plantilla completa de grupos (bolsillos) y conceptos.
--
-- Idempotente: cada INSERT usa ON CONFLICT ... DO UPDATE, de modo que volver a
-- ejecutar la migración corrige nombres, órdenes, colores y porcentajes sin
-- duplicar filas ni romper las referencias de los presupuestos ya creados.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Categorías (los porcentajes ideales suman 100).
-- -----------------------------------------------------------------------------
insert into public.categorias (nombre, slug, porcentaje_ideal, color, orden) values
  ('Gastos del hogar',             'gastos-del-hogar',            30, '#E8B84B', 1),
  ('Necesidades básicas',          'necesidades-basicas',         25, '#E24B4A', 2),
  ('Ahorro con propósito',         'ahorro-con-proposito',        10, '#3DBB6E', 3),
  ('Diversión y gastos hormiga',   'diversion-y-gastos-hormiga',  15, '#EF9F27', 4),
  ('Educación y negocio',          'educacion-y-negocio',         10, '#378ADD', 5),
  ('Deudas',                       'deudas',                      10, '#B0559B', 6)
on conflict (slug) do update set
  nombre           = excluded.nombre,
  porcentaje_ideal = excluded.porcentaje_ideal,
  color            = excluded.color,
  orden            = excluded.orden;

-- -----------------------------------------------------------------------------
-- 2. Grupos de la plantilla (en la app: "bolsillos").
-- -----------------------------------------------------------------------------
insert into public.plantilla_grupos (categoria_id, nombre, orden)
select c.id, g.nombre, g.orden::smallint
from (values
  ('gastos-del-hogar',           'Servicios públicos y telecomunicaciones', 1),
  ('gastos-del-hogar',           'Vivienda',                                2),
  ('gastos-del-hogar',           'Alimentación y aseo',                     3),
  ('gastos-del-hogar',           'Hijos / familiares / mascotas / otros',   4),
  ('necesidades-basicas',        'Transporte',                              1),
  ('necesidades-basicas',        'Ropa, belleza y artículos',               2),
  ('necesidades-basicas',        'Salud',                                   3),
  ('ahorro-con-proposito',       'Ahorro con propósito',                    1),
  ('ahorro-con-proposito',       'Fondo de emergencia',                     2),
  ('diversion-y-gastos-hormiga', 'Restaurantes, salidas y otros',           1),
  ('diversion-y-gastos-hormiga', 'Plataformas digitales',                   2),
  ('educacion-y-negocio',        'Negocio / Educación',                     1),
  ('deudas',                     'Deudas',                                  1)
) as g(cat_slug, nombre, orden)
join public.categorias c on c.slug = g.cat_slug
on conflict (categoria_id, nombre) do update set
  orden = excluded.orden;

-- -----------------------------------------------------------------------------
-- 3. Conceptos de la plantilla (líneas de gasto sugeridas por grupo).
-- -----------------------------------------------------------------------------
insert into public.plantilla_conceptos (plantilla_grupo_id, nombre, orden)
select pg.id, x.nombre, x.orden::smallint
from (values
  -- ---------- Gastos del hogar ----------
  ('gastos-del-hogar', 'Servicios públicos y telecomunicaciones', 'Agua',                                     1),
  ('gastos-del-hogar', 'Servicios públicos y telecomunicaciones', 'Energía',                                  2),
  ('gastos-del-hogar', 'Servicios públicos y telecomunicaciones', 'Gas',                                      3),
  ('gastos-del-hogar', 'Servicios públicos y telecomunicaciones', 'Internet',                                 4),
  ('gastos-del-hogar', 'Servicios públicos y telecomunicaciones', 'TV por cable',                             5),
  ('gastos-del-hogar', 'Servicios públicos y telecomunicaciones', 'Telefonía',                                6),
  ('gastos-del-hogar', 'Servicios públicos y telecomunicaciones', 'Celular (plan móvil)',                     7),
  ('gastos-del-hogar', 'Servicios públicos y telecomunicaciones', 'Otros',                                    8),

  ('gastos-del-hogar', 'Vivienda', 'Arrendamiento',                                  1),
  ('gastos-del-hogar', 'Vivienda', 'Cuota de administración',                        2),
  ('gastos-del-hogar', 'Vivienda', 'Mantenimiento de la vivienda',                   3),
  ('gastos-del-hogar', 'Vivienda', 'Seguro de vivienda',                             4),
  ('gastos-del-hogar', 'Vivienda', 'Impuesto predial',                               5),
  ('gastos-del-hogar', 'Vivienda', 'Otros artículos del hogar y jardinería',         6),
  ('gastos-del-hogar', 'Vivienda', 'Ayuda doméstica',                                7),

  ('gastos-del-hogar', 'Alimentación y aseo', 'Mercado completo del mes',            1),
  ('gastos-del-hogar', 'Alimentación y aseo', 'Elementos de limpieza del hogar',     2),
  ('gastos-del-hogar', 'Alimentación y aseo', 'Ajustes de mercado',                  3),

  ('gastos-del-hogar', 'Hijos / familiares / mascotas / otros', 'Alimentación, aseo y cuidados de mascota', 1),
  ('gastos-del-hogar', 'Hijos / familiares / mascotas / otros', 'Cuotas familiares y otros',                2),
  ('gastos-del-hogar', 'Hijos / familiares / mascotas / otros', 'Caridad, limosna y otros',                 3),

  -- ---------- Necesidades básicas ----------
  ('necesidades-basicas', 'Transporte', 'Transporte público (bus, metro, etc.)',        1),
  ('necesidades-basicas', 'Transporte', 'Taxi, Uber u otro transporte particular',      2),
  ('necesidades-basicas', 'Transporte', 'Gasolina de transporte propio',                3),
  ('necesidades-basicas', 'Transporte', 'Parqueaderos',                                 4),
  ('necesidades-basicas', 'Transporte', 'Mantenimiento y repuestos del vehículo',       5),
  ('necesidades-basicas', 'Transporte', 'Impuestos y semaforización',                   6),
  ('necesidades-basicas', 'Transporte', 'Seguro de robo y daños a terceros o GPS',      7),
  ('necesidades-basicas', 'Transporte', 'SOAT',                                         8),
  ('necesidades-basicas', 'Transporte', 'Revisión tecnomecánica',                       9),
  ('necesidades-basicas', 'Transporte', 'Peajes y lavadas',                            10),

  ('necesidades-basicas', 'Ropa, belleza y artículos', 'Ropa, calzado, bolsos, accesorios, relojes', 1),
  ('necesidades-basicas', 'Ropa, belleza y artículos', 'Peluquería, uñas, pestañas, spa y otros',    2),
  ('necesidades-basicas', 'Ropa, belleza y artículos', 'Perfumes, cuidado de piel y cabello',        3),
  ('necesidades-basicas', 'Ropa, belleza y artículos', 'Cambio de celular',                          4),
  ('necesidades-basicas', 'Ropa, belleza y artículos', 'Lentes',                                     5),

  ('necesidades-basicas', 'Salud', 'Plan complementario / Seguridad social / Medicina', 1),
  ('necesidades-basicas', 'Salud', 'Citas médicas, psicólogo, odontólogo',              2),
  ('necesidades-basicas', 'Salud', 'Medicamentos, vitaminas, suplementos',              3),
  ('necesidades-basicas', 'Salud', 'Gimnasio y entrenador',                             4),
  ('necesidades-basicas', 'Salud', 'Funeraria',                                         5),
  ('necesidades-basicas', 'Salud', 'Seguros propios y de otros integrantes',            6),

  -- ---------- Ahorro con propósito ----------
  ('ahorro-con-proposito', 'Ahorro con propósito', 'Vivienda',      1),
  ('ahorro-con-proposito', 'Ahorro con propósito', 'Estudio',       2),
  ('ahorro-con-proposito', 'Ahorro con propósito', 'Vehículo',      3),
  ('ahorro-con-proposito', 'Ahorro con propósito', 'Viaje',         4),
  ('ahorro-con-proposito', 'Ahorro con propósito', 'Emprendimiento',5),
  ('ahorro-con-proposito', 'Ahorro con propósito', 'Pensión',       6),
  ('ahorro-con-proposito', 'Ahorro con propósito', 'Inversión',     7),
  ('ahorro-con-proposito', 'Ahorro con propósito', 'Tecnología',    8),

  ('ahorro-con-proposito', 'Fondo de emergencia', 'Fondo para gastos imprevistos', 1),

  -- ---------- Diversión y gastos hormiga ----------
  ('diversion-y-gastos-hormiga', 'Restaurantes, salidas y otros', 'Restaurantes',                    1),
  ('diversion-y-gastos-hormiga', 'Restaurantes, salidas y otros', 'Domicilios',                      2),
  ('diversion-y-gastos-hormiga', 'Restaurantes, salidas y otros', 'Mecato',                          3),
  ('diversion-y-gastos-hormiga', 'Restaurantes, salidas y otros', 'Cine',                            4),
  ('diversion-y-gastos-hormiga', 'Restaurantes, salidas y otros', 'Conciertos',                      5),
  ('diversion-y-gastos-hormiga', 'Restaurantes, salidas y otros', 'Teatro u otros eventos',          6),
  ('diversion-y-gastos-hormiga', 'Restaurantes, salidas y otros', 'Viajes internacionales',          7),
  ('diversion-y-gastos-hormiga', 'Restaurantes, salidas y otros', 'Viajes nacionales',               8),
  ('diversion-y-gastos-hormiga', 'Restaurantes, salidas y otros', 'Viajes locales',                  9),
  ('diversion-y-gastos-hormiga', 'Restaurantes, salidas y otros', 'Fiestas',                        10),
  ('diversion-y-gastos-hormiga', 'Restaurantes, salidas y otros', 'Vicio (fumar, tomar, apuestas)', 11),
  ('diversion-y-gastos-hormiga', 'Restaurantes, salidas y otros', 'Clases recreativas',             12),
  ('diversion-y-gastos-hormiga', 'Restaurantes, salidas y otros', 'Regalos',                        13),
  ('diversion-y-gastos-hormiga', 'Restaurantes, salidas y otros', 'Hobbies',                        14),

  ('diversion-y-gastos-hormiga', 'Plataformas digitales', 'Netflix',           1),
  ('diversion-y-gastos-hormiga', 'Plataformas digitales', 'Disney/HBO',        2),
  ('diversion-y-gastos-hormiga', 'Plataformas digitales', 'Spotify',           3),
  ('diversion-y-gastos-hormiga', 'Plataformas digitales', 'Youtube',           4),
  ('diversion-y-gastos-hormiga', 'Plataformas digitales', 'Otras (PS, Xbox)',  5),
  ('diversion-y-gastos-hormiga', 'Plataformas digitales', 'Amazon',            6),

  -- ---------- Educación y negocio ----------
  ('educacion-y-negocio', 'Negocio / Educación', 'Matrículas, pensiones y semestres',        1),
  ('educacion-y-negocio', 'Negocio / Educación', 'Útiles escolares y libros',                2),
  ('educacion-y-negocio', 'Negocio / Educación', 'Elementos de papelería',                   3),
  ('educacion-y-negocio', 'Negocio / Educación', 'Alimentación en la institución educativa', 4),
  ('educacion-y-negocio', 'Negocio / Educación', 'Transporte educativo',                     5),
  ('educacion-y-negocio', 'Negocio / Educación', 'Uniformes y tecnología',                   6),
  ('educacion-y-negocio', 'Negocio / Educación', 'Suscripciones laborales o educativas',     7),
  ('educacion-y-negocio', 'Negocio / Educación', 'Declaración de renta',                     8),
  ('educacion-y-negocio', 'Negocio / Educación', 'Abogados y servicios profesionales',       9),
  ('educacion-y-negocio', 'Negocio / Educación', 'Asesorías y cursos',                      10),

  -- ---------- Deudas ----------
  ('deudas', 'Deudas', 'Tarjeta de crédito',            1),
  ('deudas', 'Deudas', 'Crédito de libre inversión',    2),
  ('deudas', 'Deudas', 'Crédito de vehículo',           3),
  ('deudas', 'Deudas', 'Almacenes / electrodomésticos', 4),
  ('deudas', 'Deudas', 'Televisor',                     5)
) as x(cat_slug, grupo, nombre, orden)
join public.categorias c        on c.slug = x.cat_slug
join public.plantilla_grupos pg on pg.categoria_id = c.id and pg.nombre = x.grupo
on conflict (plantilla_grupo_id, nombre) do update set
  orden = excluded.orden;

-- -----------------------------------------------------------------------------
-- 4. Verificación de la semilla: si algo falta, la migración falla aquí en vez
--    de dejar la base a medio sembrar.
-- -----------------------------------------------------------------------------
do $$
declare
  n_categorias integer;
  n_grupos     integer;
  n_conceptos  integer;
  suma_pct     numeric;
begin
  select count(*), coalesce(sum(porcentaje_ideal), 0) into n_categorias, suma_pct from public.categorias;
  select count(*) into n_grupos    from public.plantilla_grupos;
  select count(*) into n_conceptos from public.plantilla_conceptos;

  if n_categorias <> 6 then
    raise exception 'Se esperaban 6 categorias, hay %', n_categorias;
  end if;
  if suma_pct <> 100 then
    raise exception 'Los porcentajes ideales suman % en vez de 100', suma_pct;
  end if;
  if n_grupos <> 13 then
    raise exception 'Se esperaban 13 grupos de plantilla, hay %', n_grupos;
  end if;
  if n_conceptos <> 86 then
    raise exception 'Se esperaban 86 conceptos de plantilla, hay %', n_conceptos;
  end if;
end;
$$;
