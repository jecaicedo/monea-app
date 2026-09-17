-- =============================================================================
-- 0002_funciones_comunes.sql
-- Funciones utilitarias usadas por tablas, triggers y vistas.
-- Debe ejecutarse ANTES de 0004 porque las tablas de usuario cuelgan sus
-- triggers de updated_at de public.set_updated_at().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- set_updated_at(): trigger genérico que refresca la columna updated_at en cada
-- UPDATE. Se instala en todas las tablas de usuario que tienen esa columna.
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: mantiene updated_at = now() automaticamente.';

-- -----------------------------------------------------------------------------
-- redondear_mil(): redondea un valor en pesos al múltiplo de 1.000 más cercano.
-- La nómina colombiana que modela esta app liquida las deducciones de salud y
-- pensión redondeadas al mil, no al peso. Ejemplo de referencia:
--   bruto 3.699.520 -> 4% = 147.980,80 -> 148.000 por cada deduccion
--   neto = 3.699.520 - 296.000 = 3.403.520
-- Si tu pagaduría redondea distinto (al peso, o hacia abajo), este es el único
-- punto que hay que cambiar: neto_ingreso() depende exclusivamente de aquí.
-- -----------------------------------------------------------------------------
create or replace function public.redondear_mil(valor numeric)
returns numeric
language sql
immutable
as $$
  select round(coalesce(valor, 0) / 1000.0) * 1000;
$$;

comment on function public.redondear_mil(numeric) is
  'Redondea un monto en COP al multiplo de 1.000 mas cercano (regla de nomina).';

-- -----------------------------------------------------------------------------
-- normalizar_a_mensual(): lleva cualquier monto a su equivalente mensual.
-- Multiplicadores:
--   dia x30 | semana x(52/12) | quincena x2 | mes x1
--   bimestre /2 | trimestre /3 | semestre /6 | año /12
-- Acepta variantes de escritura ('año', 'anio', 'ano', 'anual', plurales,
-- mayúsculas) para que el frontend no tenga que normalizar antes de guardar.
-- Una frecuencia desconocida o nula se trata como mensual (x1).
-- -----------------------------------------------------------------------------
create or replace function public.normalizar_a_mensual(
  monto numeric,
  frecuencia text
)
returns numeric
language sql
immutable
as $$
  select coalesce(monto, 0) * case replace(lower(trim(coalesce(frecuencia, 'mes'))), 'ñ', 'n')
    when 'dia'       then 30::numeric
    when 'dias'      then 30::numeric
    when 'diario'    then 30::numeric
    when 'semana'    then 52::numeric / 12::numeric
    when 'semanas'   then 52::numeric / 12::numeric
    when 'semanal'   then 52::numeric / 12::numeric
    when 'quincena'  then 2::numeric
    when 'quincenal' then 2::numeric
    when 'mes'       then 1::numeric
    when 'mensual'   then 1::numeric
    when 'bimestre'  then 1::numeric / 2::numeric
    when 'bimestral' then 1::numeric / 2::numeric
    when 'trimestre' then 1::numeric / 3::numeric
    when 'trimestral'then 1::numeric / 3::numeric
    when 'semestre'  then 1::numeric / 6::numeric
    when 'semestral' then 1::numeric / 6::numeric
    when 'ano'       then 1::numeric / 12::numeric
    when 'anio'      then 1::numeric / 12::numeric
    when 'anual'     then 1::numeric / 12::numeric
    else 1::numeric
  end;
$$;

comment on function public.normalizar_a_mensual(numeric, text) is
  'Convierte un monto de cualquier frecuencia (dia, semana, quincena, mes, '
  'bimestre, trimestre, semestre, año) a su equivalente mensual.';
