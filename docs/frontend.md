# Frontend — Monea

PWA de presupuesto personal para el contexto colombiano. Este documento cubre
el andamiaje: estructura, sistema de temas, autenticación, navegación y PWA.
El backend está documentado aparte en [backend.md](./backend.md).

---

## 1. Stack

| Pieza | Versión | Para qué |
|---|---|---|
| React | 19 | UI |
| Vite | 8 | Bundler y dev server |
| TypeScript | 6 | Tipado |
| Tailwind CSS | 4 | Estilos (configuración CSS-first, sin `tailwind.config.js`) |
| vite-plugin-pwa | 1 | Manifest y service worker |
| Zustand | 5 | Estado global |
| React Router | 7 | Navegación |
| @supabase/supabase-js | 2 | Backend |
| @fontsource-variable/{inter,sora} | 5 | Tipografías autoalojadas |
| oxlint | 1 | Linter |

---

## 2. Arrancar el proyecto

```bash
npm install          # dependencias
cp .env.example .env # y llenar las dos variables (ver abajo)
npm run dev          # http://localhost:5173
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Typecheck (`tsc -b`) + build de producción + service worker |
| `npm run preview` | Sirve `dist/` — **es la forma de probar la instalación de la PWA** |
| `npm run lint` | oxlint |

### Variables de entorno

El `.env` va en la raíz y **no se versiona** (`.gitignore` lo excluye; el
`.env.example` sí se versiona).

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Salen de *Dashboard de Supabase → Project Settings → API*. Usa la llave
**`anon public`**: es pública por diseño y lo que protege los datos son las
políticas RLS. **Nunca** pongas aquí la `service_role`, que hace bypass de RLS
y quedaría expuesta en el bundle del navegador.

Vite solo lee el `.env` al arrancar: si lo cambias, reinicia `npm run dev`.
Si falta una variable, `src/lib/supabase.ts` lanza un error explícito en vez de
fallar con un mensaje críptico de red.

---

## 3. Estructura

```
src/
  components/      UI reutilizable
    ui/            Primitivas sin lógica de negocio: Boton, CampoTexto, iconos
  pages/           Una pantalla por ruta; exportan `default`
    presupuesto/   Layout de sub-pestañas + Actualiza / Revisa / Distribuir
  lib/             Utilidades sin UI
  stores/          Estado global Zustand
  styles/          theme.css — el único archivo con colores
  types/           Tipos del backend y de las variables de entorno
scripts/           Utilidades de mantenimiento (generador de iconos)
public/            Iconos y favicon; se copian tal cual al build
```

### Qué hay en `lib/`

| Archivo | Responsabilidad |
|---|---|
| `supabase.ts` | Cliente único de Supabase, tipado con `Database` |
| `formato.ts` | `formatearCOP()`, `formatearNumero()`, `formatearPorcentaje()` en locale `es-CO` |
| `errores.ts` | Traduce los errores de Supabase Auth al español |
| `validacion.ts` | Validación de correo y largo mínimo de contraseña |
| `inicializacion.ts` | Llama la RPC `inicializar_presupuesto()` la primera vez |

Alias de importación: `@/` apunta a `src/` (configurado en `vite.config.ts` y
en `tsconfig.app.json`).

---

## 4. Temas y design tokens

**Regla única: ningún componente escribe un color literal.** Ni `#hex`, ni
`rgb()`, ni utilidades de la paleta de Tailwind (`bg-green-500`). Todo sale de
[`src/styles/theme.css`](../src/styles/theme.css).

### Cómo funciona

Tailwind v4 es CSS-first: lo declarado dentro de `@theme` se convierte en
utilidades. `--color-surface` genera `bg-surface`, `text-surface`,
`border-surface`.

- El bloque `@theme` define el **tema oscuro**, que es el default.
- El bloque `[data-theme='claro']` redefine las mismas variables.
- Las utilidades apuntan a `var(--color-…)`, así que el cambio es instantáneo
  y **no hay que tocar ni un componente**.

El tema se aplica como atributo `data-theme` en `<html>`. Lo maneja
`src/stores/tema.ts`, que lo guarda en `localStorage` bajo `miplata:tema`.

> En `index.html` hay un script inline que aplica el tema guardado **antes del
> primer pintado**. Sin él se ve un flashazo del tema equivocado en cada
> recarga. Si cambias la lógica del tema, actualiza los dos lugares.

### Los tokens

| Token | Función | Utilidades típicas |
|---|---|---|
| `bg` | Fondo de la app | `bg-bg` |
| `surface` | Tarjetas y paneles | `bg-surface` |
| `surface-2` | Un escalón de separación: inputs, filas | `bg-surface-2` |
| `accent` | Acento / cian de logro, **legible como texto** | `text-accent` |
| `accent-fill` | Versión vibrante para **rellenos sólidos** | `bg-accent-fill` |
| `on-accent` | Texto encima de `accent-fill` | `text-on-accent` |
| `accent-soft` | Fondo tenue del acento (chips, pestaña activa) | `bg-accent-soft` |
| `positive` / `positive-fill` / `positive-soft` | Verdes: progreso, superávit | `text-positive` |
| `danger` / `danger-fill` / `danger-soft` | Rojos: déficit, alertas, eliminar | `text-danger` |
| `text` | Texto principal | `text-text` |
| `text-muted` (alias `muted`) | Texto secundario | `text-muted` |
| `border` | Bordes y separadores | `border-border` |
| `ring` | Anillo de foco | usado en `:focus-visible` |
| `shadow` | Color base de las sombras | usado por `shadow-card` |

También hay tokens de forma: `rounded-card` (12px), `rounded-panel` (20px),
`rounded-pill`; sombras `shadow-card` y `shadow-flotante`; y fuentes
`font-sans` (Inter) y `font-display` (Sora).

### Por qué existen `accent` y `accent-fill`

El cian `#22D3EE` es perfecto sobre fondo oscuro, pero sobre blanco solo
alcanza **1.8:1** de contraste, que no cumple AA para texto. Por eso en modo
claro `accent` baja a un cian oscuro (`#0E7490`, 5.4:1) mientras
`accent-fill` conserva el cian vibrante para botones y barras de progreso.
Lo mismo aplica a `positive` (verde `#34D399` vibrante / `#047857` en claro,
5.5:1) y `danger` (rojo `#F26D6D` vibrante / `#DC2626` en claro, 4.8:1).

**En la práctica**: para texto e iconos usa `accent`; para fondos sólidos usa
`accent-fill` y encima `text-on-accent`.

### Cambiar la paleta

Reemplaza los valores de los dos bloques de `theme.css`. Nada más. Si cambias
`--color-bg`, actualiza también:

- `COLOR_BARRA` en `src/stores/tema.ts` (color de la barra del navegador),
- el script inline de `index.html`,
- `theme_color` y `background_color` del manifest en `vite.config.ts`.

Los íconos (`public/monea-*.png`, `monea.ico`, `monea.svg`) son artes fijos de
la marca: si cambia el logo, hay que reemplazar esos archivos a mano (no hay
generador automático, ver §7).

### Cifras de dinero

Usa la clase `.cifra`: aplica la tipografía display, `tabular-nums` (para que
los dígitos no "bailen" al actualizarse) y un tracking negativo.

```tsx
<p className="cifra text-4xl font-bold text-positive">{formatearCOP(1248900)}</p>
```

---

## 5. Autenticación

`src/stores/auth.ts` es la única fuente de verdad sobre si hay sesión. Expone
`sesion`, `usuario`, `cargandoSesion`, y las acciones `registrar`,
`iniciarSesion` y `cerrarSesion`.

```tsx
const usuario = useAuth((estado) => estado.usuario)
```

`inicializarAuth()` se llama **una sola vez desde `main.tsx`, fuera de React**,
para que StrictMode (que monta los componentes dos veces en desarrollo) no
duplique la suscripción a `onAuthStateChange`.

### Tres cosas que no son obvias

**1. El nombre del registro llega al backend solo.** `signUp` manda
`options.data = { nombre }`, que Supabase guarda en `raw_user_meta_data`; el
trigger `manejar_nuevo_usuario()` (migración 0007) lo lee para llenar
`perfiles.nombre`.

**2. Hay un `setTimeout` que parece innecesario y no lo es.** Dentro del
callback de `onAuthStateChange` no se puede llamar a otras funciones de
`supabase-js`: el cliente queda esperando su propio lock y la petición nunca
resuelve. Por eso la siembra del presupuesto sale del callback con
`setTimeout(…, 0)`.

**3. `inicializar_presupuesto()` se dispara en `SIGNED_IN`, no al registrarse.**
Así funciona con confirmación de correo activada (la sesión llega después, al
abrir el enlace) y desactivada (hay sesión de inmediato). Va con doble
protección: una marca en `localStorage` por usuario, y la idempotencia de la
propia RPC. Los ajustes posibles están comentados en `src/lib/inicializacion.ts`.

### Confirmación de correo

En *Authentication → Sign In / Providers → Email* del dashboard decides si
*Confirm email* está activo:

- **Activado**: tras registrarse se ve la pantalla "revisa tu correo" y no hay
  sesión hasta confirmar.
- **Desactivado**: se entra de una. Más cómodo para desarrollar.

### Errores

`src/lib/errores.ts` traduce los errores de Supabase al español, primero por
`code` (estable entre versiones) y como respaldo por el texto del mensaje. Si
aparece uno sin traducir, se muestra el original y queda en consola —
agrégalo al mapa.

---

## 6. Rutas

```
/entrar        pública    inicio de sesión
/registro      pública    registro

/              protegida  redirige a /metas
/metas         protegida  pestaña 1
/bolsillos     protegida  pestaña 2
/otros         protegida  pestaña 3
/presupuesto   protegida  redirige a /presupuesto/actualiza
  /actualiza   ·          sub-pestaña
  /revisa      ·          sub-pestaña
  /distribuir  ·          sub-pestaña
```

Las guardas están en `src/components/rutas.tsx`:

- `RutaProtegida` — sin sesión manda a `/entrar`, guardando en el `state` a
  dónde iba para devolverlo ahí después de entrar.
- `RutaPublica` — con sesión manda a `/`.

Ambas esperan a que `cargandoSesion` sea `false` antes de decidir. Si
redirigieran de inmediato, un usuario con sesión válida vería un parpadeo del
login en cada recarga, porque leer la sesión es asíncrono.

**Presupuesto no está en la barra inferior** (solo tiene 3 pestañas): se entra
desde el botón en el encabezado de Bolsillos. Mientras estás ahí, la pestaña
Bolsillos sigue resaltada — eso lo controla `relacionadas` en
`src/components/BarraInferior.tsx`.

---

## 7. PWA

El manifest se define en `vite.config.ts` dentro del plugin `VitePWA`, con
`registerType: 'autoUpdate'`: el service worker se actualiza solo al publicar
una versión nueva.

`devOptions.enabled: true` permite probar la PWA con `npm run dev`, pero para
verificar la instalación de verdad conviene `npm run build && npm run preview`.

### Iconos

Son artes fijos de la marca en `public/`, sin generador: si cambia el logo,
hay que reemplazar estos archivos a mano y mantener los mismos nombres (o
actualizar las rutas en `vite.config.ts` e `index.html`).

| Archivo | Uso |
|---|---|
| `monea-96x96.png`, `monea-192x192.png`, `monea-512x512.png` | Iconos del manifest (`purpose: any`); el de 512 se reutiliza también como `maskable` |
| `monea-icon.png` (180×180) | `apple-touch-icon` (iOS) |
| `monea.ico` | Favicon clásico (`<link rel="icon">`) |
| `monea.svg` | Favicon en el `<link rel="icon" type="image/svg+xml">`. Ojo: es un PNG de 1.3 MB embebido en base64 dentro de un `<svg>`, no un vector real — no lo agrandes ni lo dupliques sin necesidad, porque entra íntegro al precache de workbox. |

### Sin conexión

Las tipografías van autoalojadas (`@fontsource-variable`) y entran al precache
de workbox junto con el JS, el CSS y los iconos. Por eso no se usan Google
Fonts por CDN: sin conexión la app se vería con la fuente del sistema.

### El botón "Instalar"

Solo aparece cuando el navegador dispara `beforeinstallprompt`. Si no se ve es
porque la app ya está instalada, porque el navegador no lo soporta (en Safari
iOS se instala manualmente con *Compartir → Añadir a pantalla de inicio*), o
porque no se cumplen los requisitos (manifest + service worker + HTTPS;
localhost cuenta como seguro).

---

## 8. Convenciones

- **Nombres en español**, igual que el backend: componentes en `PascalCase`,
  funciones y variables en `camelCase`, archivos de componentes en
  `PascalCase.tsx` y utilidades en `minuscula.ts`.
- **Comentarios en español**, y solo donde el código no se explica solo.
- Componentes funcionales con hooks; las páginas exportan `default`, los
  componentes exportan con nombre.
- Los selectores de Zustand se escriben campo por campo
  (`useAuth((e) => e.usuario)`) para no re-renderizar de más.
- Nada de colores literales (ver §4).

---

## 9. Pendientes

- **Deploy**: se usa `BrowserRouter`, así que el hosting debe reescribir todas
  las rutas a `index.html` o recargar en `/metas` da 404. En Vercel se resuelve
  con un `vercel.json` de rewrites; en Netlify con `_redirects`.
- **Lógica del presupuesto**: las páginas de §6 son cascarones.
- **Storage**: `antojos.foto_path` guarda una ruta, no una URL. Falta crear el
  bucket privado con políticas por carpeta `auth.uid()/…`.
- **Recuperar contraseña**: no hay flujo de "olvidé mi contraseña"
  (`resetPasswordForEmail`).
- **Perfil**: la tabla `perfiles` tiene columna `tema`, pero hoy la preferencia
  solo vive en `localStorage`. Sincronizarla haría que el tema siga al usuario
  entre dispositivos.
- **Tipos del backend**: `src/types/basedatos.ts` está escrito a mano. Cuando
  la CLI de Supabase esté enlazada se puede regenerar con
  `npx supabase gen types typescript --linked` (ojo: sobrescribe los alias del
  final del archivo).
