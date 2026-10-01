# Backend — finanzas-app

Backend completo en Supabase/PostgreSQL: esquema, catálogos, seguridad (RLS),
funciones de negocio y vistas de resumen. No incluye frontend.

Todo el dinero se guarda en `numeric` (nunca `float`) y todas las marcas de
tiempo en `timestamptz`. Nombres de tablas y columnas en español, snake_case.

---

## 1. Orden de ejecución

Las migraciones son **dependientes del orden**: cada archivo asume que el
anterior ya corrió.

| Archivo | Qué hace | Por qué va ahí |
|---|---|---|
| `0001_extensiones.sql` | Habilita `pgcrypto` | `gen_random_uuid()` lo usan todas las PK |
| `0002_funciones_comunes.sql` | `set_updated_at()`, `redondear_mil()`, `normalizar_a_mensual()` | Las tablas de 0004 cuelgan triggers de `set_updated_at()` |
| `0003_catalogos.sql` | `categorias`, `plantilla_grupos`, `plantilla_conceptos` | `bolsillos.categoria_id` referencia `categorias` |
| `0004_tablas_usuario.sql` | Las 9 tablas de usuario, índices y triggers de `updated_at` | Necesita catálogos y funciones |
| `0005_semilla_catalogos.sql` | 6 categorías + 13 grupos + 86 conceptos de plantilla | Necesita las tablas de catálogo |
| `0006_rls.sql` | RLS y políticas en todo `public`, más `GRANT`/`REVOKE` | Necesita todas las tablas creadas |
| `0007_funciones_negocio.sql` | `neto_ingreso()`, `inicializar_presupuesto()`, trigger de perfil | Necesita tablas, RLS y la semilla |
| `0008_vistas.sql` | `v_conceptos_mensuales`, `v_ingresos_netos`, `v_resumen_presupuesto`, `v_resumen_por_categoria` | Necesita `neto_ingreso()` |
| `0009_storage_antojos.sql` | Bucket privado de fotos de antojos y sus políticas | Necesita `antojos` |
| `0010_seguimiento_mensual.sql` | `seguimiento_mensual` + RLS + `inicializar_seguimiento_mes()` | Necesita `conceptos` y `normalizar_a_mensual()` |
| `0011_horarios_recordatorio.sql` | `horarios_recordatorio` + RLS, y el `unique (id, user_id)` que le faltaba a `recordatorios` | Necesita `recordatorios` |
| `0012_push_notificaciones.sql` | `push_subscripciones`, `envios_notificacion`, `ocurre_en_fecha()`, `horarios_pendientes()` | Necesita `horarios_recordatorio` |

Todo es idempotente (`if not exists`, `create or replace`, `on conflict do
update`, `drop policy if exists`): se puede volver a ejecutar la carpeta
completa sin duplicar datos ni romper nada.

### Cómo aplicarlas

```bash
# Con Supabase CLI (recomendado)
supabase db reset          # local: recrea y aplica todo en orden
supabase db push           # remoto: aplica las pendientes al proyecto enlazado

# O directo con psql, en orden alfabético
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

Desde el SQL Editor del dashboard, pegar los archivos **uno por uno en orden
numérico**.

Requisitos: PostgreSQL 15 o superior (las vistas usan `security_invoker`, que
existe desde la 15) y el esquema `auth` de Supabase.

Dos migraciones fallan a propósito si algo quedó mal, en vez de dejar la base a
medias: `0005` verifica que haya 6 categorías con porcentajes que sumen 100, 13
grupos y 86 conceptos; `0007` verifica el cálculo del neto con el caso real.

---

## 2. Decisiones que conviene conocer

### Redondeo del neto

El caso de referencia (bruto **3.699.520**, salud 4% + pensión 4%, auxilio 0,
sin descuentos → neto **3.403.520**) **no** sale de aplicar 8% exacto: eso daría
3.403.558,40. El resultado esperado sale si **cada deducción se redondea al mil
más cercano**:

```
salud   = redondear_mil(3.699.520 × 4%) = redondear_mil(147.980,80) = 148.000
pensión = redondear_mil(3.699.520 × 4%) = 148.000
neto    = 3.699.520 − 296.000 + 0 − 0   = 3.403.520  ✔
```

Esa regla vive aislada en `public.redondear_mil(numeric)` (`0002`). Si tu
pagaduría redondea al peso o hacia abajo, cambiá **solo esa función**:
`neto_ingreso()` no tiene ningún otro redondeo.

La `prima_anual` no entra en el neto mensual; se reporta aparte en
`v_resumen_presupuesto.total_prima_anual` para no inflar el presupuesto.

### Frecuencias

`normalizar_a_mensual(monto, frecuencia)` multiplica por: `dia` ×30, `semana`
×52/12, `quincena` ×2, `mes` ×1, `bimestre` ÷2, `trimestre` ÷3, `semestre` ÷6,
`anio` ÷12. Acepta variantes (`mensual`, `anual`, `año`, mayúsculas) y trata
cualquier valor desconocido como mensual. El `CHECK` de `conceptos.frecuencia`
usa `anio` (sin `ñ`) como forma canónica para evitar problemas de codificación
en el cliente.

### Llaves foráneas compuestas

Las relaciones entre tablas de usuario son `(id, user_id) → (id, user_id)`, no
solo por `id`. RLS por sí sola no impide que alguien inserte un concepto
apuntando al bolsillo de otra persona (la política solo mira el `user_id` de la
fila nueva); la FK compuesta sí lo impide a nivel de motor.

### `inicializar_presupuesto()`

RPC que copia la plantilla al usuario actual: `plantilla_grupos → bolsillos`,
`plantilla_conceptos → conceptos` (monto 0), y crea las metas base
`pasar_positivo` (estado `activa`) y `fondo_emergencia` (estado `bloqueada`,
se desbloquea al lograr la primera).

Es idempotente: si el usuario ya tiene bolsillos devuelve
`{"ya_inicializado": true, ...}` sin escribir nada, y toma un advisory lock por
usuario para que un doble clic o un reintento del cliente no cree todo dos
veces. Corre como `SECURITY INVOKER` a propósito: todas sus escrituras pasan por
las políticas RLS del usuario.

```js
const { data } = await supabase.rpc('inicializar_presupuesto')
// { ya_inicializado: false, bolsillos_creados: 13, conceptos_creados: 86, metas_creadas: 2 }
```

El perfil **no** lo crea esta función: lo crea el trigger `on_auth_user_created`
sobre `auth.users` en el momento del registro.

### `seguimiento_mensual`: el presupuesto proyectado vs. lo que pasó

`conceptos` es una **proyección** ("pienso gastar esto cada mes").
`seguimiento_mensual` (migración `0010`) es el registro de si eso se cumplió,
con una fila por concepto por mes.

Son **sistemas paralelos**. Ni `v_resumen_presupuesto`, ni el diagnóstico de
"Revisa", ni las metas leen esta tabla: sus números siguen saliendo 100% de
`conceptos`. Lo único que comparten es la lista de conceptos como referencia.

Tres decisiones que conviene conocer:

**`monto_presupuestado` es una copia congelada**, no un cálculo en vivo. Se
copia al crear la fila y no se recalcula nunca, ni siquiera durante el mes en
curso. Si el usuario corrige el presupuesto el día 10, el seguimiento de ese
mes conserva el monto con el que arrancó, que es justo lo que hace interesante
la comparación "planeaste X, pagaste Y".

**Borrar un concepto borra su historial completo.** La FK es
`on delete cascade`, así que eliminar un concepto en "Revisa" se lleva sus
marcas de todos los meses. Es una decisión consciente por simplicidad; si más
adelante el historial debe sobrevivir, hay que volver `concepto_id` nullable
con `on delete set null` y denormalizar el nombre del concepto y del bolsillo.

**El arranque de mes es una RPC, no trabajo del cliente.**
`inicializar_seguimiento_mes(anio, mes)` crea las filas que falten con un
`insert … on conflict do nothing`, lo que cubre en una sola consulta los dos
casos: el mes que empieza y el concepto agregado a mitad de mes. Es idempotente
y toma un advisory lock por usuario y mes, así que el cliente puede llamarla
cada vez que entra a la pantalla.

```js
const { data } = await supabase.rpc('inicializar_seguimiento_mes', { p_anio: 2026, p_mes: 9 })
// { creadas: 31, es_mes_actual: true }
```

**Solo siembra el MES EN CURSO.** Un mes pasado sin registros se queda vacío a
propósito: llenarlo copiaría el presupuesto de hoy a un mes que se vivió con
otro (o sin ninguno), y eso falsearía tanto el historial como la racha que
muestra Metas. Navegar el historial lo lee, nunca lo genera. Un mes futuro
tampoco se siembra, por razones obvias.

Solo entran los conceptos con monto mensual > 0. No existe una columna de
"concepto activo" en `conceptos`, así que "activo" significa exactamente eso:
que tenga monto.

---

### Horarios de aviso de un recordatorio

`horarios_recordatorio` (migración `0011`) guarda hasta 3 horas del día por
recordatorio. `recordatorios.notificar` sigue siendo el interruptor general: si
está en `false` no se envía nada, por muchos horarios que haya. El envío real
(Web Push + Edge Function + cron) todavía no existe.

**El tope de 3 es declarativo, no un trigger.** `orden` solo admite 0, 1 o 2 y
es único por recordatorio, así que la cuarta fila es imposible a nivel de
índice. Un trigger que contara filas tendría una carrera entre dos inserciones
simultáneas salvo que tomara un lock; esto no. El precio es que `orden` es una
**ranura**, no el orden de pantalla: si se borra la del medio quedan la 0 y la
2, y el cliente ordena por `hora`.

**`0011` agrega un `unique (id, user_id)` a `recordatorios`.** No lo tenía (a
diferencia de `ingresos`, `bolsillos` y `conceptos`), y sin él Postgres no deja
crear la FK compuesta `(recordatorio_id, user_id)` que el proyecto usa para que
nadie cuelgue filas del registro de otro usuario.

`hora` es `time` sin zona y siempre se interpreta en `America/Bogota`. Colombia
no tiene horario de verano, así que guardar la hora local no se desfasa dos
veces al año.

### Notificaciones push

La migración `0012` y la Edge Function `enviar-notificaciones-recordatorios`
mandan el aviso real. El cron la dispara cada 10 minutos.

**La idempotencia es "insertar antes de enviar".** `envios_notificacion` tiene
`unique (horario_id, fecha)`: la función inserta la marca *antes* de mandar el
push y, si el insert falla por conflicto, otra corrida ya tomó ese aviso y se
lo salta. Comprobar primero y escribir después dejaría pasar dos corridas
simultáneas; así la exclusión la da el índice. Esa tabla no la toca ningún
usuario: RLS activo, sin políticas y sin `grant`.

**Toda la aritmética de fechas vive en SQL**, en `ocurre_en_fecha()` y
`horarios_pendientes()`. La Edge Function corre en UTC y cerca de medianoche
calcularía mal el "hoy" de Bogotá, así que solo resuelve la hora local con
`Intl` y le pasa la ventana ya hecha a Postgres. `ocurre_en_fecha()` replica el
`clamp` de fin de mes de `src/lib/recordatorios.ts` (un recordatorio del 31 cae
el 28 en febrero) y la migración falla sola si esa aritmética se rompe: trae un
bloque de verificación con los casos límite.

**La ventana es `[desde, hasta)` y mira hacia atrás.** A las 10:00 cubre
`[09:50, 10:00)`, así el aviso llega hasta 10 minutos tarde y nunca antes de
tiempo, que es lo que promete la interfaz. Entre las 00:00 y las 00:09 se parte
en dos tramos (el final de ayer y el principio de hoy); sin eso, los últimos
minutos del día quedarían sin cubrir.

**Suscripciones muertas.** Si el envío falla con 404 o 410 el navegador revocó
la suscripción y no se recupera, así que se borra la fila en vez de reintentar
cada 10 minutos para siempre. Cualquier otro error se deja pasar y se reintenta
al día siguiente.

Los secretos (`VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`,
`CRON_SECRET`) se configuran con `npx supabase secrets set`. `SUPABASE_URL` y
`SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase solo.

**Por qué la función va con `verify_jwt = false`.** El primer intento fue que
el cron leyera la `service_role` del Vault de Postgres para armar el header
`Authorization`. No funciona: `pg_cron` corre en un contexto que no puede
descifrar `vault.decrypted_secrets`, así que todas las corridas daban 401
aunque el job figurara como `succeeded`.

La solución fue quitar la verificación de JWT (en `supabase/config.toml`, no
como bandera del deploy, que es fácil de olvidar) y que la función valide ella
misma un `x-cron-secret` contra `CRON_SECRET`. Ese secreto queda en texto plano
dentro de `cron.job`, y es un compromiso consciente: es de un solo propósito,
no la `service_role`. Quien lo tuviera solo podría disparar la función fuera de
hora — no leer ni escribir datos, y la idempotencia de `envios_notificacion`
impide que se dupliquen avisos.

---

## 3. Cómo probar que RLS funciona

### 3.1 Desde psql, simulando dos usuarios

En Supabase, `auth.uid()` lee el claim `sub` del JWT. En psql se puede fingir
ese JWT sin necesidad de autenticarse:

```sql
-- Preparar dos usuarios reales (o tomar los ids de dos cuentas existentes)
select id, email from auth.users order by created_at limit 2;
-- supongamos:  A = 11111111-1111-1111-1111-111111111111
--              B = 22222222-2222-2222-2222-222222222222

-- ---- Sesión simulada del usuario A ----
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select public.inicializar_presupuesto();     -- crea 13 bolsillos y 86 conceptos
select count(*) from public.bolsillos;       -- 13
select count(*) from public.conceptos;       -- 86
insert into public.ingresos (user_id, nombre, monto_bruto, frecuencia)
values (auth.uid(), 'Davivienda', 3699520, 'mes');
commit;

-- ---- Sesión simulada del usuario B ----
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select count(*) from public.ingresos;        -- 0  <- NO ve el ingreso de A
select count(*) from public.bolsillos;       -- 0
select count(*) from public.categorias;      -- 6  <- el catalogo si es visible
commit;
```

### 3.2 Las pruebas que deben FALLAR

Cada bloque debe terminar en error. Si alguno pasa, hay un hueco de seguridad.

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

-- 1. Insertar una fila a nombre de otro usuario -> viola la politica WITH CHECK
insert into public.ingresos (user_id, nombre, monto_bruto)
values ('11111111-1111-1111-1111-111111111111', 'Robo', 100);
--> ERROR: new row violates row-level security policy

-- 2. Cambiarle el dueño a una fila propia -> tambien viola WITH CHECK
update public.ingresos set user_id = '11111111-1111-1111-1111-111111111111';
--> 0 filas o ERROR, nunca una transferencia exitosa

-- 3. Escribir en un catalogo -> no hay politica de INSERT ni GRANT
insert into public.categorias (nombre, slug, porcentaje_ideal, color)
values ('Trampa', 'trampa', 50, '#000000');
--> ERROR: permission denied for table categorias

-- 4. Borrar datos ajenos -> el DELETE no encuentra filas visibles
delete from public.ingresos;   --> DELETE 0 (solo borra lo propio)
rollback;
```

Y la prueba de la FK compuesta, que RLS sola no cubriría:

```sql
-- Como usuario B, colgar un concepto del bolsillo de A
insert into public.conceptos (user_id, bolsillo_id, nombre)
values (auth.uid(), '<id-de-un-bolsillo-de-A>', 'Infiltrado');
--> ERROR: insert or update on table "conceptos" violates foreign key
--         constraint "conceptos_bolsillo_fk"
```

### 3.3 Verificar que RLS está activa en todas las tablas

```sql
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;
-- relrowsecurity debe ser true en las 12 tablas
```

Y el inventario de políticas (deben ser 4 por tabla de usuario con `user_id`,
2 en `perfiles`, 1 en cada catálogo):

```sql
select tablename, cmd, policyname
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

### 3.4 Desde el cliente

Con la clave `anon` y una sesión iniciada, la misma consulta devuelve solo lo
propio. Sin sesión no devuelve nada: el rol `anon` no tiene `GRANT` sobre
ninguna tabla de esta app (`0006` se lo revoca explícitamente).

```js
const { data, error } = await supabase.from('ingresos').select('*')
// con sesion: solo los ingresos del usuario
// sin sesion: [] o error de permisos, nunca datos de otro
```

---

## 4. Consultas útiles del dashboard

```sql
-- Resumen del mes del usuario actual
select * from public.v_resumen_presupuesto;
-- total_ingresos_netos | total_prima_anual | total_gastos_mensuales
-- total_ahorro_mensual | excedente

-- Las 6 categorias: cuanto va vs. cuanto deberia ir
select categoria, total_mensual, ideal_en_pesos, porcentaje_real, porcentaje_ideal
from public.v_resumen_por_categoria
order by orden;

-- Neto de cada fuente de ingreso
select ingreso, frecuencia, neto_periodo, neto_mensual from public.v_ingresos_netos;

-- Detalle de gastos ya normalizados a mensual
select categoria, bolsillo, concepto, monto, frecuencia, monto_mensual
from public.v_conceptos_mensuales
order by categoria, bolsillo, concepto;
```

`total_gastos_mensuales` excluye la categoría `ahorro-con-proposito`, que se
reporta aparte en `total_ahorro_mensual`. `excedente` = ingresos − gastos −
ahorro; cuando es negativo, el presupuesto está desbalanceado (es exactamente la
condición que persigue la meta `pasar_positivo`).

---

## 5. Pendientes para la siguiente etapa

- **Storage**: `antojos.foto_path` guarda la ruta de un archivo, no una URL. Hay
  que crear el bucket privado (p. ej. `antojos`) con políticas por carpeta
  `auth.uid()/...`.
- **Notificaciones**: `recordatorios.notificar` es solo una bandera; el envío
  (Edge Function + cron) todavía no existe.
- **Progreso de metas**: `metas.monto_actual` hoy lo actualiza el cliente. Si se
  quiere derivar del ahorro real, conviene un trigger o una función que lo
  calcule desde los bolsillos de ahorro.
