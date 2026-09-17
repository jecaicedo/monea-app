-- =============================================================================
-- 0001_extensiones.sql
-- Extensiones de PostgreSQL requeridas por el backend de la app de finanzas.
-- Idempotente: se puede ejecutar varias veces sin efectos secundarios.
-- =============================================================================

-- gen_random_uuid() para las claves primarias de todas las tablas de usuario.
create extension if not exists "pgcrypto" with schema extensions;

comment on schema public is
  'Esquema principal de la app de finanzas personales (COP). '
  'Contiene catalogos globales de solo lectura y tablas de usuario protegidas con RLS.';
