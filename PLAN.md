# Plan de Tereza (Fase 1) — web app + servidor MCP

## Contexto

Tereza es una PWA mobile first para registrar el día de un bebé (sueño, tomas, pañales, salud), con un servidor MCP remoto para registrar y consultar desde Claude. Hay un prototipo validado (`index.html`, `core.js`, `ui.js`, `screens*.js`, `tour.js`, `main.js`, sistema de diseño Tereza) y un brief. Este plan los convierte en un producto real: Next.js en Vercel, Supabase (Postgres + Auth + RLS + Storage + servidor OAuth 2.1) y MCP con Streamable HTTP.

**Decisiones confirmadas en esta conversación**
- **Repo nuevo.** Tú creas un repo vacío (p. ej. `siempreotto/tereza`), yo lo agrego a la sesión con `add_repo` y trabajo en una rama. `sento-demo-platform` queda solo como referencia: su conector MCP con OAuth de Supabase ya funciona (`src/app/api/mcp/route.ts`, `src/lib/mcp/auth.ts`, `src/app/.well-known/oauth-protected-resource/route.ts`, `src/app/oauth/consent/*`) y reuso ese patrón, adaptado a RLS con el token del usuario (allá usa service role; aquí no).
- **Supabase:** proyecto nuevo `tereza` en `us-east-1`, sin ramas por ahora (no hay datos reales). Te pido confirmación antes de crearlo, porque puede tener costo.
- **Peso en libras y onzas** («15 lb 8 oz», con kg al lado). Se captura con dos campos.
- **Noche y siesta:** un sueño es «noche» si empieza dentro de la ventana nocturna del hogar (default 6:00 p.m. a 5:00 a.m., configurable en `household_settings`). Los totales por día se cortan a medianoche en la zona del hogar, para compararlos con la referencia de 24 h. En la UI se dice «noche del sábado al domingo».

**Decisiones abiertas del prompt (aplico la recomendación salvo que digas otra cosa)**
1. Payload: Zod en la app, `CHECK (tipo in …)`, y `pg_jsonschema` con `jsonb_matches_schema` por tipo, en un `CHECK` (la extensión está documentada en Supabase).
2. Offline: cola en IndexedDB solo para crear eventos y operar temporizadores. Cada operación lleva un `client_id` uuid, así el reenvío es idempotente. Aviso «por enviar».
3. Conflictos: bloqueo optimista con `version int`. `corregir_evento` y la web mandan `expected_version`; si no coincide, se muestran ambas versiones (como `ConflictSheet` del prototipo).
4. Alarmas: detrás de la bandera `household_settings.alarmas_activas` (default `true` en modo «por validar», con la leyenda «Umbrales pendientes de validar con un pediatra» en ajustes). El texto es el de `tempAlarm` en core.js.

**Contradicciones resueltas sin preguntar (las aplico así)**
- Nombres de payload: prototipo y brief no coinciden. Uso los del brief, en snake_case: `segundos_izq/der` (no `segIzq`), `como_se_durmio` con el valor `solo` (no `sola`), `volumen_ml_izq/der`, `medication_id` + `cantidad_textual`. El origen de las medidas se amplía a `nacimiento | casa | consulta` (el prototipo usa `hospital`).
- El prototipo calcula con la hora del navegador. En producción todo se calcula en la zona del hogar (`Intl`/`Temporal` en TS y `AT TIME ZONE` en SQL).
- El rol `limitado` «ve solo hoy», pero un sueño nocturno que empezó ayer y sigue activo es necesario para operar. Regla: ve los eventos que empiezan hoy **o** que siguen abiertos (`ended_at is null`).
- `estado_actual` incluye «último medicamento», pero no para el rol `limitado`: ese campo se omite.
- En la navegación del prototipo hay 5 elementos (Hoy, Diario, +, Salud, Más). Se respeta.
- SDK de MCP: el prompt dice `@modelcontextprotocol/sdk ≥ 1.26`, pero sento-demo-platform ya usa `@modelcontextprotocol/server 2.3.1` + `mcp-handler 2.1.1`, que es la línea nueva. Uso la que `mcp-handler` declare como peer al instalar `[VERIFICAR]`.

**Detalles del prototipo que se trasladan tal cual (de `ui.js`, `screens.js`, `main.js`, `tour.js`)**
- Conflicto: la copia de `ConflictSheet` dice «la otra queda en el historial del registro». Para cumplirlo se agrega `event_revisions` (snapshot por trigger en cada update: payload, horas, `editado_por`, `source`). El detalle del evento muestra «Registrado por … desde Claude/la app» y «Editado por …».
- Alarma de pocos pañales: después de las 6 p.m. con menos de 4 mojados (detrás de la bandera). Texto de síntomas: «Si le cuesta respirar, está muy somnolienta o no logras despertarla, busca atención médica de inmediato».
- El rol limitado ve «Hoy» y «Más» (solo ajustes personales), registra sueño, toma y pañal, y la lista de hoy no abre detalle.
- Al iniciar un timer que ya existe: «Ya hay un sueño en curso desde las 2:10 p.m. No lo dupliqué.» (mismo texto en web y MCP).
- Deshacer: el aviso dura 7 s si hay «Deshacer» y 4 s si no.
- La pantalla «Pruebas» y el simulador offline del prototipo no pasan a producción.
- Los pasos y tiempos de `tour.js` son el guion de los e2e del Hito 7.

## Riesgo encontrado en la documentación (te lo señalo antes de empezar)

La documentación del servidor OAuth de Supabase dice: **«OAuth client redirect URIs require exact, complete URL matches… NO wildcards»**, y el registro dinámico exige «protocol, domain, path, and port». Claude Code registra su callback en loopback con un **puerto aleatorio**. Como el registro es dinámico, cada cliente registra su propio URI exacto, así que probablemente funcione. Pero no está confirmado que Supabase ignore el puerto en loopback (RFC 8252 §7.3). `[VERIFICAR]` en el Hito 6 con una prueba real. Plan B: `claude mcp add --callback-port <fijo>` `[VERIFICAR que exista el flag]`. Además, el servidor OAuth de Supabase está **en beta** (gratis durante la beta).

## Estado actual y cómo probar el avance

**Hoy (8 nov):** solo existe este plan. No hay código, ni proyecto de Supabase, ni proyecto de Vercel. Lo único que se puede probar es el prototipo:

```bash
npx serve carpeta-del-prototipo
```

Luego abrir `http://localhost:3000/#recorrido` para el recorrido guiado.

**Cómo ver el estado durante la construcción**
- `ESTADO.md` en la raíz del repo, actualizado en cada commit: hito actual, casillas de «terminado cuando…», último preview, pendientes manuales tuyos y riesgos abiertos.
- Un deploy de preview de Vercel por cada hito (URL fija por rama). Lo abres en el teléfono y lo instalas como PWA desde el Hito 3.
- El resumen de 5 líneas al cerrar cada hito, con el enlace del preview y qué probar.
- La pantalla «Pruebas» del prototipo se queda como `/salud` técnica (solo admin): versión desplegada, si llegan Supabase y el MCP, y la última migración aplicada. Sin datos de salud.

**Qué probar tú en cada hito (en el teléfono, 5 minutos)**
| Hito | Prueba manual |
|---|---|
| 0 | Abrir el preview: carga la página de salud con «Supabase: conectado». |
| 1 | Nada visible. Te mando la tabla de pruebas de RLS por rol (puede/no puede) en verde. |
| 2 | Entrar con Google y con correo, crear hogar y bebé, invitar a otro correo como «Limitado» y aceptar desde ese correo. |
| 3 | A las 3 a.m. simuladas (o con el interruptor): Iniciar sueño → Despertó → Toma de pecho con cambio de lado → Pañal «Ambos» → Deshacer. Ver la franja de la siesta y «¿Por qué esta franja?». Instalar en pantalla de inicio. |
| 4 | Diario de ayer, editar una hora, ver «Registrado por… desde la app», patrones de la semana. |
| 5 | Registrar peso en lb y oz, ver el percentil; agregar duda, visita con PDF adjunto e imprimir el resumen para el pediatra. |
| 6 | Agregar el conector en claude.ai con la URL `/api/mcp`, aprobar en la pantalla de consentimiento y decir las 5 frases del prompt. Revisar que los registros aparezcan en Hoy «desde Claude». |
| 7 | Modo avión: registrar un pañal, ver «por enviar», volver la red y ver que se sincroniza. Editar el mismo biberón desde dos teléfonos y ver la hoja de conflicto. Exportar CSV. |

Además, en cada hito tú no tienes que correr nada: yo ejecuto `pnpm lint`, `pnpm typecheck`, `pnpm test` y Playwright, y te paso el resultado.

## Cómo seguir en la sesión nueva
Esta sesión no puede agregar `siempreotto/tereza`, así que el trabajo sigue en una sesión nueva con ese repo seleccionado desde el inicio. Para empezar ahí:
1. Sube los mismos archivos: el prompt, `brief.md` y los del prototipo y el diseño (`index.html`, `core.js`, `ui.js`, `screens.js`, `screens2.js`, `tour.js`, `main.js`, `tokens.css`, `tokens.json`, `bundle.css`, `bundle.js`, `app.css`).
2. Pega este plan completo como primer mensaje, con la instrucción «Plan aprobado. Empieza el Hito 0.»
3. Lo que ya quedó resuelto aquí y no hay que volver a preguntar: repo nuevo, Supabase sin ramas en us-east-1 y en la organización OttoSento, peso en libras y onzas, regla de noche y siesta por ventana del hogar más corte a medianoche.

## Lo que necesito de ti para arrancar el Hito 0
1. **Bloqueado:** `add_repo siempreotto/tereza` responde «not found or no access». O el repo todavía no existe, o la Claude GitHub App no tiene acceso a él. Arreglo: crear el repo, luego en github.com/settings/installations › Claude › Repository access agregar `tereza` (o elegir «All repositories»); si eso no basta, reconectar GitHub en claude.ai/connect-github. Repo confirmado: `siempreotto/tereza` (vacío). Primer paso del Hito 0: `add_repo` con acceso push, clonar y trabajar en la rama `claude/hito-0-infra`.
2. Tu OK al costo que cotice `create_project`. La única organización de Supabase disponible es **OttoSento** (`ukqqoereyozechbqfsyi`); ahí se crea.
3. Que el MCP de Vercel esté conectado en esta sesión (ahora mismo está reconectándose).

## Hitos

Cada hito cierra con lint, typecheck y tests en verde, un commit, un deploy de preview, un resumen de 5 líneas y tu visto bueno antes de seguir.

### Hito 0 — Infraestructura
Terminado cuando: el repo, el proyecto Supabase y el proyecto Vercel existen, las variables están cargadas y el preview responde `/api/salud` con 200.
1. `add_repo` del repo nuevo y scaffold de Next.js (leer `node_modules/next/dist/docs/` por cambios de versión; Next 16 usa `proxy.ts` en vez de middleware), TS estricto, ESLint, Vitest, Playwright, pnpm.
2. Supabase MCP: `list_organizations`, luego `get_cost`/`confirm_cost` con tu OK, y `create_project` (tereza, us-east-1). Después `get_project_url` y `get_publishable_keys`.
3. Vercel MCP: `create_project` vinculado al repo y `create_project_env` (públicas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`; secreta: `SUPABASE_SECRET_KEY`, usada solo en invitaciones/eliminar cuenta y nunca en herramientas MCP).
4. Copiar `tokens.css`, `bundle.css` y `app.css` a `src/styles/` y portar los componentes de `bundle.js` a React/TS (`src/components/tz/`).
5. Ruta de salud y deploy de preview.

### Hito 1 — Esquema y RLS
Terminado cuando: las migraciones están aplicadas con `apply_migration`, `get_advisors` (security y performance) sale sin alertas críticas, los tipos están generados, las pruebas de RLS por rol pasan y están cargados los datos de ejemplo (`seedState` portado).
1. Extensiones `pg_jsonschema` (y `btree_gist` si hace falta).
2. Tablas, índices, funciones helper y políticas (esquema abajo).
3. Funciones/RPC compartidas: `sueno_por_dia`, `estadisticas_periodo`, `comparar_periodos`, `referencia_sueno`, `eventos_visibles`.
4. Pruebas SQL de RLS (`tests/rls/*.sql`, ejecutadas con `execute_sql` vía `set local role authenticated` + `request.jwt.claims`) para admin, cuidador, limitado y un ajeno.
5. `generate_typescript_types` → `src/lib/db/types.ts`. Seed con la familia del prototipo (Andrea, Diego, Abuela Carmen, Lucía de 5 meses).

### Hito 2 — Auth y onboarding
Terminado cuando: se entra con Google y con correo, se crea el hogar, se llena el perfil del bebé, se muestra sueño seguro, se invita con rol y la invitación se acepta, todo con e2e.
- Google: necesita un cliente OAuth en Google Cloud. **Paso manual tuyo** (te diré dónde hacer clic). Correo: OTP/magic link.
- RPC `crear_hogar` (`security definer`: crea household + settings + member admin en una transacción).
- Invitaciones: token de un solo uso con hash y vencimiento a 7 días. RPC `aceptar_invitacion`. Correo por el SMTP de Supabase (límite bajo; para la etapa personal alcanza. Antes de abrir a otras familias, SMTP propio `[VERIFICAR límite actual]`).
- Edad corregida si nació antes de las 37 semanas.

### Hito 3 — Hoy y registro
Terminado cuando: el estado es el héroe, hay temporizadores (pecho por lado, pausa), hojas de registro para todos los tipos, deshacer, modo noche automático, predictor en Hoy y PWA instalable. Vitest de la lógica portada en verde.
- `src/lib/core/` porta core.js tipado y con tests: `format.ts` (12 h a.m./p.m., «Sábado 7 de noviembre», duraciones), `units.ts` (ml/oz a 0.5 oz, lb+oz, cm/in), `age.ts` (edad y edad corregida), `sleep.ts` (`daySleep`, `periodStats` con zona del hogar y ventana nocturna), `predict.ts` (predictor tal cual con sus avisos y el copy obligatorio), `alarms.ts`, `relativeTime.ts` («a las 2» → la ocurrencia pasada más reciente, con aviso en la respuesta).
- Escrituras por Server Actions con el cliente del usuario (RLS). Deshacer = `eliminado_en`.
- Modo noche: `data-theme="noche"` según el horario del hogar o el interruptor manual. Sin auras, sin animaciones.
- PWA: manifest + service worker `[VERIFICAR guía de PWA en docs de Next 16]`.

### Hito 4 — Diario y análisis
Terminado cuando: hay línea de 24 h, detalle y edición con conflicto, quién y desde dónde, patrones semanales contra la referencia por edad y resumen hoy/7/30.

### Hito 5 — Salud
Terminado cuando: hay crecimiento con curvas OMS oficiales, medicamentos (solo registro), pediatra y visitas con adjuntos en Storage (bucket privado, ruta `household_id/…`, URLs firmadas cortas), dudas y resumen imprimible.
- Tablas OMS 0–24 meses con LMS (peso, longitud y perímetro cefálico por edad y sexo) en `src/data/who/*.json`; percentil por la fórmula LMS. `[VERIFICAR fuente oficial y licencia de las tablas WHO Child Growth Standards]`.

### Hito 6 — Servidor MCP
Terminado cuando: hay OAuth con Supabase, consentimiento propio, todas las herramientas de 6.2, auditoría, pruebas en MCP Inspector y en integración, y el conector está agregado y probado desde Claude con las 5 frases del prompt.
1. **Paso manual tuyo:** Authentication › OAuth Server › activar, Authorization Path `/oauth/consent`, activar Dynamic client registration. En URL Configuration, Site URL = dominio de Vercel. JWT Signing Keys: migrar a asimétricas (ES256/RS256) para validar contra JWKS.
2. `/oauth/consent` (página + acción): muestra el nombre del cliente, el dominio de `redirect_uri`, lo que podrá hacer (según rol), «Permitir» / «No permitir» y «Puedes revocarlo en Más › Conexión con Claude». Usa `supabase.auth.oauth.getAuthorizationDetails/approveAuthorization/denyAuthorization` (confirmado en docs).
3. `/.well-known/oauth-protected-resource` (y `/…/api/mcp`): `resource` = `https://<dominio>/api/mcp` exacto y `authorization_servers: ["https://<ref>.supabase.co/auth/v1"]`.
4. `/api/mcp`: `createMcpHandler` + `withMcpAuth({ required: true })` → 401 con `WWW-Authenticate: Bearer resource_metadata=…`. `verifyToken`: verifica el JWT contra JWKS (`jose`, caché), exige `client_id`, `iss` y `exp`, y crea un cliente Supabase con `Authorization: Bearer <token>` para que aplique RLS. Busca la membresía y el rol una vez por request.
5. Herramientas (contratos abajo) en `src/lib/mcp/tools/*`, cada una con `annotations` (`readOnlyHint` / `destructiveHint`), respuesta en español + `structuredContent`, y un registro en `mcp_audit` (sin payload de salud).
6. «Conexión con Claude»: lista desde `mcp_audit` + grants. Revocar = RPC que llama al endpoint admin de grants de OAuth `[VERIFICAR API de revocación de grants por usuario]`. Si no existe, se marca el `client_id` como bloqueado en `mcp_revocados` y `verifyToken` lo rechaza.
7. Guía para agregar el conector en Claude (web, móvil, Claude Code) y prueba de las 5 frases.

### Hito 7 — Robustez
Terminado cuando: hay cola offline, UI de conflictos, AA en Día y Noche (axe en Playwright), exportar CSV/JSON, eliminar cuenta (con confirmación, borrado real en cascada) y Playwright de los flujos de `tour.js` (primeros minutos, primer día, Diego desde Claude, la primera noche, día con fiebre, día de consulta).

## Esquema SQL (resumen de la migración base)

```sql
create extension if not exists pg_jsonschema;

create type rol_miembro as enum ('admin','cuidador','limitado');
create type tipo_evento as enum ('sueno','toma_pecho','toma_biberon','toma_solidos','extraccion','panal','medicamento','temperatura','sintoma','nota');

create table households (id uuid pk default gen_random_uuid(), nombre text not null, creado_en timestamptz default now());
create table household_settings (
  household_id uuid pk references households on delete cascade,
  zona_horaria text not null default 'America/Guatemala' check (zona_horaria in (select name from pg_timezone_names)) -- vía trigger, no CHECK con subquery
  , unidad_volumen text default 'oz' check (unidad_volumen in ('ml','oz'))
  , unidad_peso text default 'lb' check (unidad_peso in ('kg','lb'))
  , unidad_longitud text default 'in' check (unidad_longitud in ('cm','in'))
  , noche_ui_desde time default '19:00', noche_ui_hasta time default '06:00', noche_ui_modo text default 'auto' -- modo noche visual
  , sueno_noche_desde time default '18:00', sueno_noche_hasta time default '05:00'  -- clasificación noche/siesta
  , ventanas_modo text default 'auto' check (ventanas_modo in ('auto','propias')), ventanas_propias int[]  -- Fase 2 en UI
  , hora_dormir time default '19:15', notificaciones jsonb default '{}'
  , alarmas_activas boolean default true, editado_en timestamptz default now());
create table members (id uuid pk, household_id uuid references households on delete cascade, user_id uuid references auth.users on delete cascade,
  nombre_visible text not null, rol rol_miembro not null, creado_en timestamptz default now(), unique (household_id, user_id));
create table invites (id uuid pk, household_id uuid ..., email citext not null, rol rol_miembro not null, token_hash text unique not null,
  creada_por uuid, vence_en timestamptz not null, aceptada_en timestamptz);
create table babies (id uuid pk, household_id uuid ..., nombre text not null, fecha_nacimiento date not null,
  semanas_gestacion int check (semanas_gestacion between 22 and 44), sexo char(1) not null check (sexo in ('F','M')),
  foto_path text, activo boolean default true, proxima_cita jsonb);  -- {fecha, titulo, pediatra}
create table events (
  id uuid pk default gen_random_uuid(), household_id uuid not null ..., baby_id uuid not null references babies,
  tipo tipo_evento not null, started_at timestamptz not null, ended_at timestamptz check (ended_at is null or ended_at >= started_at),
  payload jsonb not null default '{}', notas text, logged_by uuid not null references auth.users,
  source text not null check (source in ('web','mcp')), client_op_id uuid unique,      -- idempotencia offline
  version int not null default 1, creado_en timestamptz default now(),
  editado_en timestamptz, editado_por uuid, eliminado_en timestamptz,
  constraint payload_valido check (tereza.payload_valido(tipo, payload)));  -- jsonb_matches_schema por tipo
create unique index un_timer_activo on events (baby_id, tipo) where ended_at is null and eliminado_en is null and tipo in ('sueno','toma_pecho','extraccion');
create index on events (household_id, baby_id, started_at desc) where eliminado_en is null;
create table measurements (id, household_id, baby_id, medido_en timestamptz, peso_g int, longitud_mm int, perimetro_cefalico_mm int,
  origen text check (origen in ('nacimiento','casa','consulta')), notas, logged_by, source, creado_en,
  check (coalesce(peso_g, longitud_mm, perimetro_cefalico_mm) is not null));
create table medications (id, household_id, baby_id, nombre text, indicacion_textual text, prescrito_por text, inicio date, fin date, activo bool);
create table visits (id, household_id, baby_id, fecha timestamptz, pediatra, motivo, notas, vacunas jsonb, adjuntos text[]);  -- paths de Storage
create table questions (id, household_id, baby_id, texto, creada_por, creada_en, source, resuelta_en_visita_id uuid references visits);
create table mcp_audit (id bigserial, household_id uuid, user_id uuid, client_id text, herramienta text, resultado text check (resultado in ('ok','error','denegado')),
  codigo_error text, creado_en timestamptz default now());  -- sin argumentos ni payload
```

`event_revisions (id, event_id, version, started_at, ended_at, payload, notas, editado_por, source, creado_en)`: misma RLS de select que su evento, solo se inserta por trigger.

Triggers: `editado_en/editado_por/version+1` + snapshot en `event_revisions` en update de events; `household_id` del evento = `household_id` del bebé.

**Helpers (`security definer`, `set search_path = ''`, `stable`):**
- `is_member(h uuid)`, `member_role(h uuid) returns rol_miembro`.
- `hoy_inicio(h uuid) returns timestamptz`: medianoche de hoy en la zona del hogar.

**Políticas (todas las tablas con RLS activado; `(select auth.uid())` para que se cachee):**
- households/settings/babies: select si `is_member`; update de settings/households/babies solo si es `admin` (las preferencias de notificación personales irían en `members`).
- members/invites: select si `is_member`; insert/update/delete solo si es `admin` (aceptar invitación va por RPC).
- events select: `is_member(h) and (member_role(h) <> 'limitado' or (tipo in ('sueno','toma_pecho','toma_biberon','toma_solidos','extraccion','panal') and (started_at >= hoy_inicio(h) or ended_at is null)))`.
- events insert: `is_member` + `logged_by = auth.uid()` + si es limitado, solo esos tipos. Update: cuidador/admin cualquier evento; limitado solo los suyos de hoy (para cerrar timers y deshacer). Sin delete físico (salvo eliminar cuenta, por RPC).
- measurements/medications/visits/questions: todo si `member_role in ('admin','cuidador')`.
- mcp_audit: insert propio; select si es `admin` del hogar (para «Conexión con Claude»).
- Storage `visitas`: privado, política por el primer segmento del path = household del que es miembro no limitado.

**RPC compartidas por web y MCP** (`security invoker`, así respetan RLS): `sueno_por_dia(baby, desde, hasta)` → filas {fecha, total_min, noche_min, siestas_min, n_siestas}; `estadisticas_periodo(baby, desde, hasta)`; `comparar_periodos(baby, a_desde, a_hasta, b_desde, b_hasta)`; `referencia_sueno(meses)`. Esta lógica vive en SQL y la de TS se prueba contra los mismos fixtures, para que web y MCP den los mismos números.

## Contratos de herramientas MCP

Convenciones comunes: `baby_id` (uuid, opcional, se infiere si hay uno; si hay varios responde un error que pide aclarar cuál y los lista). Horas como texto ISO **o** expresión natural (`"14:00"`, `"a las 2"`, `"hace 20 minutos"`) resuelta en la zona del hogar; si se tuvo que desambiguar, se avisa. Toda salida = `content` en texto en español + `structuredContent`. Errores con `isError` y un `codigo` (`PERMISO`, `BEBE_AMBIGUO`, `NO_ENCONTRADO`, `CONFLICTO`, `VALIDACION`, `TIMER_ACTIVO`).

`EventoOut` = `{event_id, tipo, started_at, ended_at|null, payload, notas, logged_by_nombre, source, version, resumen_texto}`.

| Herramienta | Input (JSON Schema, resumido) | Output | Anotación |
|---|---|---|---|
| `listar_bebes` | `{}` | `{bebes:[{baby_id,nombre,edad_texto,edad_corregida_texto?}]}` | read |
| `estado_actual` | `{baby_id?}` | `{estado:"duerme"\|"despierto", desde, ultima_toma?:EventoOut, ultimo_panal?, ultimo_medicamento?(omitido a limitado), timers_activos:EventoOut[], prediccion?:Prediccion}` | read |
| `iniciar_timer` | `{baby_id?, tipo:enum[sueno,toma_pecho,extraccion], inicio?:string, lado?:enum[izq,der] (requerido si toma_pecho), lugar?, como_se_durmio?}` | `{evento:EventoOut, ya_existia:boolean}` | — |
| `cambiar_lado` | `{baby_id?}` | `{evento, lado_activo}` | — |
| `pausar_toma` | `{baby_id?, reanudar?:boolean}` | `{evento, pausada:boolean}` | — |
| `terminar_timer` | `{baby_id?, tipo, fin?:string, payload?:object}` | `{evento, duracion_min, alarma?:Alarma}` | — |
| `registrar_evento` | `{baby_id?, tipo:tipo_evento, started_at:string, ended_at?:string, payload:object (oneOf por tipo; volúmenes aceptan {valor, unidad:ml\|oz}), notas?}` | `{evento, interpretacion_hora?:string, alarma?:Alarma}` | — |
| `corregir_evento` | `{event_id, expected_version:int, started_at?, ended_at?, payload?:object (merge), notas?}` | `{evento}` o error `CONFLICTO` con `{actual:EventoOut}` | — |
| `eliminar_evento` | `{event_id}` | `{event_id, eliminado_en, como_revertir:"deshacer_eliminacion"}` | destructive |
| `deshacer_eliminacion` | `{event_id}` | `{evento}` | — |
| `consultar_eventos` | `{baby_id?, tipos?:tipo_evento[], desde?, hasta?, logged_by?:string, source?:enum[web,mcp], limite?:int≤200 (def 50)}` | `{eventos:EventoOut[], truncado:boolean}` | read |
| `resumen` | `{baby_id?, periodo:enum[hoy,ayer,7d,30d,semana,mes,rango], desde?, hasta?}` | `{rango, dias_con_registros, sueno:{total_prom_min, noche_prom_min, siestas_prom_min, n_siestas_prom, referencia:{min_h,max_h,texto}}, tomas:{pecho:{n,min_izq,min_der}, biberon:{n,volumen_total_ml,volumen_prom_ml}, solidos:{n}}, panales:{mojados,sucios}, medicamentos:[{nombre,n}], temperaturas:[{valor_c,at}]}` | read |
| `analizar_periodo` | `{baby_id?, periodo:enum[semana,mes,7d,30d,rango], desde?, hasta?}` | `{actual:Resumen, anterior:Resumen, diferencias:{campo:{abs,pct}}, por_dia:[{fecha, sueno_min, siestas, tomas, mojados}], horarios:{dormir_mediana, despertar_mediana}, ventanas_vigilia:{mediana_min, dispersion_min}, dias_atipicos:[{fecha,motivo}], datos_faltantes:[fecha], texto, aviso_pediatra?}` | read |
| `predecir_proximo_sueno` | `{baby_id?}` | `Prediccion = {tipo:"siesta"\|"dormir"\|null, desde, hasta, confianza:enum[alta,media,baja], base:string, rango_edad_min:[int,int], avisos:string[], usa_ventanas_propias:boolean, nota:"Estimación basada en la edad de {nombre} y en sus últimos registros", razon_sin_prediccion?}` | read |
| `registrar_medida` | `{baby_id?, medido_en?, peso?:{kg}\|{lb,oz}, longitud?:{valor,unidad}, perimetro?:{valor,unidad}, origen:enum[casa,consulta]}` | `{medida_id, percentiles:{peso?,longitud?,perimetro?}, edad_corregida_usada}` | — |
| `registrar_medicamento` | `{baby_id?, medication_id?, nombre?, cantidad_textual:string, via?, hora?, indicacion_textual? (si crea)}` | `{evento, tratamiento_creado:boolean}` | — |
| `gestionar_tratamiento` | `{accion:enum[crear,terminar], medication_id?, nombre?, indicacion_textual?, prescrito_por?}` | `{tratamiento}` | — |
| `agregar_duda_pediatra` / `resolver_duda` | `{texto}` / `{question_id, visita_id?}` | `{duda}` | — |
| `proxima_cita` | `{accion:enum[leer,fijar], fecha?, titulo?, pediatra?}` | `{cita\|null}` | read cuando es `leer` (dos herramientas si el cliente no acepta anotación condicional) |
| `resumen_pediatra` | `{baby_id?, desde?, hasta?}` | `{desde_ultima_visita, crecimiento:[…con percentil], sueno, tomas, medicamentos_administrados, temperaturas, sintomas, dudas_pendientes, texto}` | read |
| `ver_configuracion` | `{}` | `{unidades, zona_horaria, modo_noche, ventana_sueno_nocturno, ventanas_vigilia, hora_dormir, notificaciones, cuidadores:[{nombre,rol}]}` | read |
| `cambiar_configuracion` | `{cambios: {unidad_volumen?, unidad_peso?, unidad_longitud?, zona_horaria?, modo_noche?, hora_dormir?, ventanas?, notificaciones?, rol?:{miembro, rol}}}` | `{cambios:[{campo, anterior, nuevo}], como_revertir}` | — |
| `invitar_cuidador` | `{email, rol}` (solo admin) | `{invitacion_id, vence_en}` | — |

Las descripciones de `registrar_medicamento` y `gestionar_tratamiento` incluyen literalmente: «Solo registra. Nunca sugiere, calcula ni valida dosis, intervalos o combinaciones. Ante una pregunta de dosis, remite al pediatra o farmacéutico y a la etiqueta del producto.» `Alarma = {titulo, texto, accion}`; solo aparece si `alarmas_activas`.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Loopback con puerto aleatorio vs. coincidencia exacta de redirect URI | Prueba temprana en el Hito 6 con Claude Code; plan B con puerto fijo. Se documenta en la guía. |
| Servidor OAuth de Supabase en beta | Aislar la verificación en `verifyToken`; tests de contrato de discovery/401; monitorear el changelog. |
| Token del usuario + RLS en cada herramienta: latencia | Un cliente por request, JWKS en caché, RPC agregadas en vez de N consultas; meta < 1 s por herramienta. |
| Zona horaria y DST (otros países después) | Cálculo siempre por zona del hogar; tests con `America/Guatemala` y `America/Mexico_City`/`America/Santiago`. |
| Prompt injection desde notas o dudas leídas por Claude | Texto libre devuelto como dato y nunca concatenado en instrucciones; las herramientas destructivas son reversibles. |
| Datos de salud en logs | Logger propio con lista blanca; `mcp_audit` sin argumentos; sin analítica en Fase 1. |
| Umbrales de alarma no validados | Bandera + leyenda; textos que remiten al pediatra sin diagnosticar. |
| Tablas OMS: licencia y fidelidad | `[VERIFICAR]` y tests contra valores publicados (P3/P50/P97 en meses 0, 6, 12 y 24). |
| Pocos correos con el SMTP por defecto de Supabase | Suficiente para la etapa personal; SMTP propio antes de abrir. |

## Fuera de alcance (Fase 1)

Notificaciones push, editor de ventanas de vigilia en la UI (el modelo ya las guarda), ruido blanco/cursos, wearables, chat con expertos, app nativa, monetización, multi-idioma, cumplimiento legal por país (requisito antes de abrir a otras familias).

**Esbozo de Fase 2:** push con Web Push y VAPID (el cron de Vercel calcula la franja; aviso N minutos antes; horas de silencio), editor de ventanas propias, revisión legal de datos de salud de menores por mercado (Guatemala, México, Colombia…), SMTP propio y ramas de Supabase.

## Verificación

- Por hito: `pnpm lint`, `pnpm typecheck`, `pnpm test`, más `get_advisors` después de cada migración y el deploy de preview en Vercel (`get_runtime_errors` si falla).
- RLS: matriz de pruebas SQL por rol (puede/no puede) sobre el seed.
- Lógica: Vitest con fixtures del prototipo (los resultados de `predict`/`periodStats` del prototipo como referencia, ajustados a la zona del hogar).
- MCP: MCP Inspector contra el preview; tests de integración que llaman cada herramienta con tokens de admin, cuidador y limitado; `curl` del 401 + `WWW-Authenticate` y del metadata. Al final, conectar en Claude y probar las 5 frases del prompt.
- E2E: Playwright con los capítulos de `tour.js`, en ancho móvil y de escritorio, en modo Día y Noche, con axe.
