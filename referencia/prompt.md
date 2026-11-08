# Prompt para Claude Code: Tereza (web app + servidor MCP)

> Pega todo este archivo como primer mensaje en Claude Code, dentro de una carpeta vacía donde ya descomprimiste `tereza-referencia.zip`.
> Requisito previo (una sola vez): tener conectados en Claude Code los MCP de Supabase y de Vercel.
> `claude mcp add --transport http supabase https://mcp.supabase.com/mcp`
> `claude mcp add --transport http vercel https://mcp.vercel.com`
> Luego `/mcp` para autenticar cada uno.

---

## 1. Tu rol y cómo vas a trabajar

Eres el lead técnico de **Tereza**, una web app (PWA, mobile first) para registrar el día de un bebé, con un servidor MCP remoto para usarla desde Claude. Priorizas lo que le sirve a un padre agotado a las 3 a.m. por encima de lo que luce en una demo. Señalas riesgos de privacidad y de seguridad infantil sin que te los pida.

Trabaja en este orden y no te lo saltes:

1. **Lee la referencia** en `referencia/` (sección 3). No empieces a escribir código antes.
2. **Entra en modo plan.** Lista las ambigüedades o contradicciones que encuentres entre este prompt, el brief y el prototipo, y pregúntame. Espera mi respuesta.
3. **Entrega el plan**: hitos con criterio de «terminado», tareas por hito en orden de dependencia, esquema SQL con políticas RLS, contrato de cada herramienta MCP (input y output en JSON Schema), riesgos con mitigación y lo que queda fuera. Marca con `[VERIFICAR]` cualquier afirmación sobre librerías o plataformas que no hayas confirmado en documentación actual (usa el MCP de Supabase `search_docs` y el de Vercel `search_vercel_documentation`).
4. **Con mi aprobación**, implementa hito por hito. Al cerrar cada hito: lint, typecheck y tests en verde, un commit con mensaje claro, un deploy de preview y un resumen de 5 líneas de lo que cambió y lo que sigue. Pregunta antes de pasar al siguiente hito.

Toda la infraestructura la manejas tú con los MCP. No me pidas configurar nada a mano salvo lo que un MCP no pueda hacer (por ejemplo, activar una opción del dashboard); en ese caso dime exactamente dónde hacer clic.

---

## 2. Stack (decidido)

| Capa | Decisión |
|---|---|
| Web | Next.js (App Router, TypeScript estricto), PWA instalable, desplegada en Vercel |
| Datos y auth | Supabase: Postgres, Auth, Row Level Security, Storage (adjuntos de visitas) |
| MCP | Servidor remoto con transporte Streamable HTTP, dentro del mismo proyecto Next.js en Vercel, usando `mcp-handler` + `@modelcontextprotocol/sdk` (el SDK en 1.26.0 o superior) `[VERIFICAR versiones al instalar]` |
| Auth del MCP | **Supabase Auth como servidor OAuth 2.1** (con registro dinámico de clientes activado). El servidor MCP es solo *resource server*: valida tokens, nunca los emite |
| Validación | Zod en la capa de app; restricciones en Postgres para lo crítico (ver decisiones abiertas) |
| Estilos | Tokens del sistema de diseño Tereza (`referencia/design/tokens.css` y `app.css`) |
| Tests | Vitest para lógica (predictor, estadísticas, conversión de unidades, horas relativas), pruebas SQL de RLS, Playwright para los flujos clave |

### Infraestructura vía MCP (Hito 0)

- **Supabase MCP**: lista organizaciones y proyectos; si no existe, propón crear el proyecto `tereza` (región más cercana a Guatemala) y pídeme confirmación antes de crearlo porque puede tener costo. Usa `apply_migration` para todo cambio de esquema (nunca SQL suelto que altere tablas), `get_advisors` (security y performance) después de cada migración, `generate_typescript_types` para los tipos y `get_project_url` / `get_publishable_keys` para las variables de entorno. Si el plan lo permite, trabaja en una rama de desarrollo; si no, pregúntame.
- **Vercel MCP**: crea o vincula el proyecto, carga las variables de entorno (públicas y secretas por separado), despliega previews y revisa `get_runtime_logs` / `get_runtime_errors` cuando algo falle.
- La `service_role key` solo vive como variable secreta del servidor y **nunca** se usa dentro de las herramientas MCP ni en código de cliente.

---

## 3. Referencia que ya existe (léela primero)

En `referencia/`:

- `brief.md`: el brief maestro del producto. Es la fuente de verdad de alcance, modelo de datos, reglas de seguridad y copy, salvo donde este prompt lo actualiza (sección 4).
- `prototipo/`: prototipo funcional en HTML/JS que ya validamos (abre `prototipo/index.html` con un servidor local; carga React y htm desde CDN). Úsalo como referencia de:
  - **UI y flujos**: todas las pantallas, hojas de registro, estados vacíos, sin conexión, conflicto, rol limitado y el recorrido guiado (`tour.js`).
  - **Lógica para portar a TypeScript** (en `core.js`): formato de horas, conversión de unidades, edad, percentiles OMS aproximados, estadísticas por período, **predictor de siesta** y reglas de alarma de temperatura. Pórtala con tests; no la copies sin tipar.
  - Las curvas OMS del prototipo son **aproximadas**: en producción usa las tablas oficiales de la OMS (peso, longitud y perímetro cefálico por edad, por sexo) cargadas como datos `[VERIFICAR fuente y licencia]`.
- `design/`: `tokens.json` y `tokens.css` del sistema Tereza (temas Día y Noche) y `app.css` con el layout responsive. Respeta tokens, tipografías (Outfit y Nunito), radios y la regla de que los colores de categoría solo van en íconos, trazos y puntos.

---

## 4. Decisiones ya tomadas (actualizan el brief)

- **Nombre:** Tereza. Tratamiento de **tú**.
- **Formato:** hora en 12 h con «a.m./p.m.», decimales con punto, fechas «Sábado 7 de noviembre».
- **Unidades por hogar**, guardadas siempre en métrico: biberón ml/oz (default oz), peso kg/lb (default lb), longitud cm/in, temperatura °C.
- **Zona horaria por hogar**, default `America/Guatemala`. Todo en `timestamptz`; las horas relativas («hace 20 minutos», «a las 2») se interpretan en la zona del hogar.
- **Modo noche:** automático de 7:00 p.m. a 6:00 a.m. (configurable), más un interruptor manual. En noche: texto `#ddd6ee`, sin halos de fondo, sin animaciones ni pulsos.
- **Responsive:** < 640 px barra inferior flotante con botón +, registro en hojas desde abajo; 640–1023 px misma estructura centrada; ≥ 1024 px barra lateral con «Registrar», dos columnas y las hojas se vuelven diálogos centrados.
- **Deshacer en vez de confirmar:** cada registro muestra «Guardé: …» con «Deshacer». Confirmación solo para borrado definitivo (eliminar cuenta).
- **Cambio respecto al brief:** el **predictor de próxima siesta y hora de dormir pasa a Fase 1** (solo la estimación con su explicación, en la app y en el MCP). Las notificaciones push y el ajuste manual de ventanas siguen en Fase 2, aunque el modelo de datos ya debe guardar las ventanas personalizadas.

### Decisiones abiertas que debes proponer en el plan (con recomendación)

1. Validación de `payload` por tipo de evento: recomiendo Zod en la app + `CHECK` de `tipo` y, si está disponible, `pg_jsonschema` en Postgres `[VERIFICAR extensión]`.
2. Offline en Fase 1: recomiendo cola local (IndexedDB) solo para crear eventos y temporizadores, con sincronización al volver la red y aviso «por enviar».
3. Conflictos de edición: recomiendo bloqueo optimista con `version` o `editado_en`, mostrando ambas versiones para elegir (como en el prototipo).
4. Umbrales de alarma: están **por validar con un pediatra**. Impleméntalos detrás de una bandera de configuración y con el texto tal como está en el brief.

---

## 5. Modelo de datos (base del brief, con ajustes)

Tablas: `households`, `household_settings` (unidades, zona horaria, horario noche, ventanas de vigilia auto/propias, hora habitual de dormir, preferencias de notificación), `members` (rol `admin | cuidador | limitado`), `invites`, `babies` (con `semanas_gestacion` para edad corregida hasta los 24 meses), `events` (tabla única con `tipo`, `started_at`, `ended_at`, `payload jsonb`, `notas`, `logged_by`, `source web|mcp`, `creado_en`, `editado_en`, `editado_por`, `eliminado_en`), `measurements`, `medications`, `visits` (+ Storage para adjuntos), `questions`, `next_appointment` (o columna en `babies`) y una tabla de **auditoría de acciones MCP** (herramienta, usuario, `client_id`, resultado, sin payload de salud).

Reglas:

- RLS en **todas** las tablas por `household_id`, con funciones `security definer` del tipo `is_member(household_id)` y `member_role(household_id)`.
- Rol `limitado`: puede insertar eventos `sueno`, `toma_*` y `panal`, y leer solo los eventos del día actual en la zona del hogar. No ve medicamentos, visitas, crecimiento, dudas ni días anteriores.
- **Un solo temporizador activo por tipo y bebé** (índice único parcial sobre `ended_at is null and eliminado_en is null`).
- Borrado lógico con `eliminado_en` (permite deshacer).
- Funciones SQL o RPC reutilizables por la web y por el MCP: sueño por día (noche y siestas), estadísticas de período, comparación con el período anterior y referencia de sueño por edad.
- Ningún dato de salud en URLs, logs del servidor ni analítica.

---

## 6. Servidor MCP (prioridad del producto)

### 6.1 Autenticación compatible con Claude

Requisitos que el servidor debe cumplir para agregarse como conector personalizado en Claude (web, escritorio, móvil y Claude Code):

- Activa el **OAuth 2.1 Server de Supabase Auth** con registro dinámico de clientes. Metadatos del servidor de autorización en `https://<ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1` (issuer `https://<ref>.supabase.co/auth/v1`) `[VERIFICAR en docs actuales]`.
- **Pantalla de consentimiento propia** en Next.js (Supabase redirige a tu UI de autorización): muestra el nombre del cliente, el dominio de redirección, lo que podrá hacer, botones «Permitir» / «No permitir» y cómo revocar después.
- Ruta de **protected resource metadata** (`/.well-known/oauth-protected-resource`) cuyo `resource` sea **exactamente** la URL del MCP que el usuario pega en Claude, con el issuer de Supabase como **primer y único** `authorization_servers`.
- Sin token, el MCP responde **401** con `WWW-Authenticate: Bearer resource_metadata="<url>"`. Claude no acepta ese header en un 200.
- Redirect URIs aceptados: `https://claude.ai/api/mcp/auth_callback` y loopback para Claude Code (`http://localhost/callback` y `http://127.0.0.1/callback` **en cualquier puerto**) `[VERIFICAR que Supabase permita loopback sin puerto fijo]`.
- PKCE S256, rotación de refresh tokens y respuestas de discovery, registro y token en menos de 10 s.
- Validación del token: JWT de Supabase (incluye `sub`, `role` y `client_id`) verificado contra las llaves del proyecto; con ese mismo token crea un cliente de Supabase **del usuario** para que RLS aplique en cada herramienta. Nada de service role en las herramientas.
- Página «Conexión con Claude» en la app: estado, cuidadores conectados, último uso y «Revocar».

### 6.2 Herramientas

Todas responden en español, con lo que quedó guardado en lenguaje claro y el `event_id` («Guardé: biberón de 4 oz de fórmula, 2:00 p.m., sobró 0.5 oz»). Marca las de solo lectura con `readOnlyHint` y las de borrado con `destructiveHint`. El rol `limitado` recibe un error de permiso claro en las que no le tocan.

**Estado y registro**

| Herramienta | Qué hace |
|---|---|
| `listar_bebes` | Bebés activos del hogar (para cuando hay más de uno) |
| `estado_actual` | Duerme o está despierto y desde cuándo, última toma, último pañal, último medicamento, temporizadores activos y próxima estimación de sueño |
| `iniciar_timer` | Sueño, toma de pecho (con lado) o extracción. Si ya hay uno activo, devuelve el existente y no duplica |
| `cambiar_lado` / `pausar_toma` | Para la toma de pecho en curso |
| `terminar_timer` | Cierra el activo y completa el payload |
| `registrar_evento` | Evento ya ocurrido o puntual, de cualquier tipo del brief |
| `corregir_evento` | Cambia horas o payload, con control de conflicto |
| `eliminar_evento` / `deshacer_eliminacion` | Borrado lógico y su reversión |

**Consultas y análisis**

| Herramienta | Qué hace |
|---|---|
| `consultar_eventos` | Línea de tiempo filtrada por tipos, rango, quién registró y origen |
| `resumen` | Métricas de `hoy`, `ayer`, `7d`, `30d`, `semana` (lunes a domingo), `mes` o rango: sueño total (noche y siestas) contra la referencia por edad, número de siestas, tomas (pecho con minutos por lado, biberón con volumen), pañales mojados y sucios, medicamentos, temperaturas |
| `analizar_periodo` | **Análisis de la semana o del mes**: tendencias día a día, comparación con el período anterior (diferencias absolutas y en %), horarios típicos de dormir y despertar, regularidad de las ventanas de vigilia, días atípicos (fiebre, siestas cortas, pocos pañales) y datos faltantes. Devuelve números estructurados **y** un resumen en texto. Nunca diagnostica: habla de «referencia por edad» y de «registros», y sugiere consultar al pediatra cuando algo coincide con señales de alarma |
| `predecir_proximo_sueno` | Franja estimada (±15 min) para la próxima siesta u hora de dormir, nivel de confianza (alta, media, baja), la base del cálculo («mediana ponderada de los últimos 7 días antes de la 2.ª siesta: 2 h 15 min»), el rango por edad y avisos (siesta corta, día con fiebre, ventanas propias en uso). Sin predicción antes de las 8 semanas de edad corregida. Copy obligatorio: «Estimación basada en la edad de {nombre} y en sus últimos registros» |

**Salud** (no disponibles para el rol limitado)

| Herramienta | Qué hace |
|---|---|
| `registrar_medida` | Peso, longitud o perímetro, y devuelve el percentil OMS por edad corregida |
| `registrar_medicamento` | Registra una administración de un tratamiento existente o crea el tratamiento con la indicación textual del cuidador |
| `gestionar_tratamiento` | Crear o terminar un tratamiento (solo texto de la indicación, sin interpretarla) |
| `agregar_duda_pediatra` / `resolver_duda` | Dudas para la próxima consulta |
| `proxima_cita` | Leer o fijar la próxima cita |
| `resumen_pediatra` | Informe desde la última visita (o un rango): crecimiento y percentiles, promedios de sueño y tomas, medicamentos administrados, síntomas y temperaturas, dudas pendientes |

**Configuración**

| Herramienta | Qué hace |
|---|---|
| `ver_configuracion` | Unidades, zona horaria, horario del modo noche, ventanas de vigilia (automáticas o propias), hora habitual de dormir, preferencias de notificación, cuidadores y roles |
| `cambiar_configuracion` | Cambia cualquiera de los anteriores con validación. Los cambios del hogar (unidades, zona horaria, roles) requieren rol `admin`. Responde con el valor anterior y el nuevo, y cómo revertirlo |
| `invitar_cuidador` | Solo `admin`: correo y rol |

### 6.3 Comportamiento obligatorio

- Si hay un solo bebé activo, `baby_id` se infiere. Si hay más de uno y no se indica, devuelve un error que pide aclarar cuál.
- «A las 2» ambiguo: elige la ocurrencia más reciente en el pasado y dilo en la respuesta para que el cuidador corrija.
- Toda escritura guarda `logged_by` y `source = 'mcp'` y queda en la auditoría.
- **Medicamentos: solo registran.** Nunca sugieren, calculan ni validan dosis, intervalos o combinaciones. Ante una pregunta de dosis, remiten al pediatra o farmacéutico y a la etiqueta. Esta regla va en la descripción de cada herramienta de medicamentos.
- Señales de alarma (temperatura ≥ 38 °C en menores de 3 meses, temperatura alta persistente, muy pocos pañales mojados, rechazo repetido de tomas, somnolencia excesiva, dificultad para respirar): la respuesta agrega una nota breve y directa con una acción concreta. Umbrales detrás de bandera, pendientes de validar.
- Ningún resumen, análisis ni predicción se presenta como diagnóstico.
- Prueba cada herramienta con MCP Inspector y con tests de integración contra una base con datos de ejemplo (los del prototipo). Al final del hito MCP, guíame para agregarlo como conector personalizado en Claude y probar: «¿Cuándo será la próxima siesta?», «Tomó 4 oz a las 2 y se durmió a la mitad», «Cambia el biberón a mililitros», «Hazme el análisis de la semana» y «¿Cómo estuvo el mes comparado con el anterior?».

---

## 7. Hitos sugeridos (ajústalos en el plan)

| Hito | Terminado cuando… |
|---|---|
| 0. Infraestructura | Repo, proyecto Supabase y proyecto Vercel creados por MCP, variables cargadas, preview desplegado con una página de salud |
| 1. Esquema y RLS | Migraciones aplicadas, advisors sin alertas críticas, tipos generados, pruebas de RLS por rol en verde, datos de ejemplo |
| 2. Auth y onboarding | Google y correo, crear hogar, perfil del bebé, sueño seguro, invitar con rol, aceptar invitación |
| 3. Hoy y registro | Estado como héroe, temporizadores (pecho por lado), hojas de registro, deshacer, modo noche automático, predictor en Hoy, PWA instalable |
| 4. Diario y análisis | Línea de 24 h, detalle y edición, patrones semanales, resumen hoy/7/30 |
| 5. Salud | Crecimiento con curvas OMS oficiales, medicamentos, pediatra y visitas con adjuntos, dudas, resumen para el pediatra |
| 6. Servidor MCP | OAuth con Supabase, consentimiento, todas las herramientas de 6.2, auditoría, conectado y probado desde Claude |
| 7. Robustez | Cola offline, conflictos, accesibilidad AA en ambos modos, exportar CSV/JSON, eliminar cuenta, Playwright de los flujos del recorrido guiado |

Fase 2 (solo esbozo en el plan): notificaciones push antes de la franja estimada, editor de ventanas de vigilia en la UI y requisitos legales de datos de salud de menores por país antes de abrir a otras familias.

---

## 8. Reglas de calidad

- Español claro y en voz activa; los botones dicen lo que hacen; los errores dicen qué pasó y cómo resolverlo; nunca culpar al cuidador.
- Objetivos táctiles de 48 px o más, acciones principales en el tercio inferior, contraste AA en Día y Noche, foco visible, respeto a movimiento reducido, nunca solo color para distinguir tipos de evento.
- Copys prohibidos: «basado en ciencia del sueño», «científicamente probado», «lo que debería dormir». Usa «Referencia por edad» y «Estimación basada en la edad y en sus registros».
- Pregúntame antes de: crear recursos con costo, borrar datos, cambiar el alcance o tocar producción.

Empieza leyendo `referencia/` y respondiendo con tus preguntas.
