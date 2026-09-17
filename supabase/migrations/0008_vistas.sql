-- =============================================================================
-- 0008_vistas.sql
-- Vistas de lectura para el dashboard.
--
-- Todas se crean con security_invoker = on: la vista se evalúa con los permisos
-- y las políticas RLS de quien consulta, así que un usuario solo ve su propia
-- información aunque la vista no filtre explícitamente por auth.uid().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- v_conceptos_mensuales: cada concepto con su equivalente mensual ya calculado
-- y con la categoría a la que pertenece. Es la base de las demás vistas y le
-- evita al frontend repetir la conversión de frecuencias.
-- -----------------------------------------------------------------------------
create or replace view public.v_conceptos_mensuales
with (security_invoker = on) as
select
  co.user_id,
  co.id                as concepto_id,
  co.nombre            as concepto,
  co.monto,
  co.frecuencia,
  public.normalizar_a_mensual(co.monto, co.frecuencia) as monto_mensual,
  b.id                 as bolsillo_id,
  b.nombre             as bolsillo,
  b.es_fondo_emergencia,
  c.id                 as categoria_id,
  c.slug               as categoria_slug,
  c.nombre             as categoria,
  c.color              as categoria_color,
  c.porcentaje_ideal
from public.conceptos co
join public.bolsillos  b on b.id = co.bolsillo_id
join public.categorias c on c.id = b.categoria_id;

comment on view public.v_conceptos_mensuales is
  'Cada concepto del usuario con su monto normalizado a mensual y su bolsillo y categoria.';

-- -----------------------------------------------------------------------------
-- v_ingresos_netos: neto de cada ingreso, en su propia frecuencia y
-- normalizado a mensual (una quincena cuenta dos veces por mes).
-- -----------------------------------------------------------------------------
create or replace view public.v_ingresos_netos
with (security_invoker = on) as
select
  i.user_id,
  i.id     as ingreso_id,
  i.nombre as ingreso,
  i.banco,
  i.frecuencia,
  i.monto_bruto,
  public.neto_ingreso(i)                                            as neto_periodo,
  public.normalizar_a_mensual(public.neto_ingreso(i), i.frecuencia) as neto_mensual,
  i.prima_anual
from public.ingresos i;

comment on view public.v_ingresos_netos is
  'Neto de cada fuente de ingreso, por periodo y normalizado a mensual.';

-- -----------------------------------------------------------------------------
-- v_resumen_presupuesto: una fila por usuario con los totales del mes.
--
--   total_ingresos_netos  suma de los netos mensuales de todas las fuentes
--   total_gastos          conceptos de todas las categorias EXCEPTO ahorro
--   total_ahorro          conceptos de la categoria 'ahorro-con-proposito'
--   excedente             ingresos - gastos - ahorro (negativo = presupuesto
--                         desbalanceado; es la meta 'pasar_positivo')
-- -----------------------------------------------------------------------------
create or replace view public.v_resumen_presupuesto
with (security_invoker = on) as
select
  p.id                                        as user_id,
  coalesce(ing.total_neto_mensual, 0)         as total_ingresos_netos,
  coalesce(ing.total_prima_anual, 0)          as total_prima_anual,
  coalesce(gas.total_gastos, 0)               as total_gastos_mensuales,
  coalesce(gas.total_ahorro, 0)               as total_ahorro_mensual,
  coalesce(ing.total_neto_mensual, 0)
    - coalesce(gas.total_gastos, 0)
    - coalesce(gas.total_ahorro, 0)           as excedente
from public.perfiles p
left join (
  select v.user_id,
         sum(v.neto_mensual) as total_neto_mensual,
         sum(v.prima_anual)  as total_prima_anual
  from public.v_ingresos_netos v
  group by v.user_id
) ing on ing.user_id = p.id
left join (
  select v.user_id,
         sum(v.monto_mensual) filter (where v.categoria_slug <> 'ahorro-con-proposito') as total_gastos,
         sum(v.monto_mensual) filter (where v.categoria_slug =  'ahorro-con-proposito') as total_ahorro
  from public.v_conceptos_mensuales v
  group by v.user_id
) gas on gas.user_id = p.id;

comment on view public.v_resumen_presupuesto is
  'Una fila por usuario: ingresos netos mensuales, gastos, ahorro y excedente del mes.';

-- -----------------------------------------------------------------------------
-- v_resumen_por_categoria: el total mensual de cada una de las 6 categorías,
-- contra el ideal en pesos que corresponde al ingreso neto del usuario.
-- Devuelve siempre las 6 filas, incluso las que van en cero.
-- -----------------------------------------------------------------------------
create or replace view public.v_resumen_por_categoria
with (security_invoker = on) as
select
  p.id                              as user_id,
  c.id                              as categoria_id,
  c.slug                            as categoria_slug,
  c.nombre                          as categoria,
  c.color                           as categoria_color,
  c.orden,
  c.porcentaje_ideal,
  coalesce(t.total_mensual, 0)      as total_mensual,
  round(coalesce(r.total_ingresos_netos, 0) * c.porcentaje_ideal / 100, 2) as ideal_en_pesos,
  case
    when coalesce(r.total_ingresos_netos, 0) > 0
      then round(coalesce(t.total_mensual, 0) * 100 / r.total_ingresos_netos, 2)
    else 0
  end                               as porcentaje_real
from public.perfiles p
cross join public.categorias c
left join (
  select v.user_id, v.categoria_id, sum(v.monto_mensual) as total_mensual
  from public.v_conceptos_mensuales v
  group by v.user_id, v.categoria_id
) t on t.user_id = p.id and t.categoria_id = c.id
left join public.v_resumen_presupuesto r on r.user_id = p.id;

comment on view public.v_resumen_por_categoria is
  'Total mensual por categoria de cada usuario, con el ideal en pesos y el porcentaje real.';

grant select on
  public.v_conceptos_mensuales,
  public.v_ingresos_netos,
  public.v_resumen_presupuesto,
  public.v_resumen_por_categoria
  to authenticated;

-- Las vistas se crean despues del REVOKE de 0006, y los privilegios por defecto
-- de Supabase podrian otorgarle acceso al rol anon: se lo quitamos explicito.
revoke all on
  public.v_conceptos_mensuales,
  public.v_ingresos_netos,
  public.v_resumen_presupuesto,
  public.v_resumen_por_categoria
  from anon;
