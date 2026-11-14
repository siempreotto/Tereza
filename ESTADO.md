# Estado de Tereza

**Hito actual:** 7 de 7 terminados en código. En producción: https://tereza-kappa.vercel.app
**Rama:** `main` (cada hito tiene su rama `claude/hito-N-…`)
**Configuración pendiente:** ver «Pendientes manuales tuyos» abajo y `CONFIGURACION.md`

## Cómo conectar Claude (cuando el OAuth de Supabase esté guardado)
1. En Claude: Ajustes › Conectores › Agregar conector personalizado › URL `https://tereza-kappa.vercel.app/api/mcp`.
2. Entra con tu cuenta de Tereza y toca «Permitir».
3. Prueba: «Lucía se durmió a las 2», «¿cuándo fue la última toma?», «dale 4 oz de fórmula hace 20 minutos», «¿cómo durmió esta semana comparada con la anterior?», «anota para el pediatra que tose de noche».
4. En Claude Code: `claude mcp add --transport http tereza https://tereza-kappa.vercel.app/api/mcp`.

## Hito 0: infraestructura ✔
Repo, Supabase (`jkqwlczjqoqmxhatqfad`, us-east-1) y Vercel (`tereza`, Sento Product). `/api/salud` responde «Supabase: conectado».

## Hito 1: terminado cuando…
- [x] Migraciones aplicadas con `apply_migration` (`supabase/migrations/`): base, rls, rpc, ajustes_hito1
- [x] Payload validado por tipo con `pg_jsonschema`; un solo temporizador activo por tipo y bebé
- [x] RLS en las 13 tablas; funciones de apoyo `security definer` en el esquema `private`
- [x] Advisors: sin alertas críticas (3 WARN intencionales: `crear_hogar`, `crear_invitacion` y `aceptar_invitacion` validan permisos por dentro; INFO de índices sin uso, normal con pocos datos)
- [x] Tipos generados en `src/lib/db/types.ts`; clientes de Supabase tipados
- [x] Pruebas de RLS por rol en verde: **35/35** (`supabase/tests/rls.sql`, no deja datos)
- [x] Datos de ejemplo cargados (`supabase/seed/ejemplo.sql`): Casa de Lucía con 10 días de registros, visitas, medidas, tratamientos, cita y dudas
- [x] Estadísticas verificadas con el ejemplo: unas 13.6 h de sueño al día (referencia 12 a 16 h), 3 siestas, 6 tomas y 5 pañales mojados al día

## Matriz de RLS (resumen)
| Rol | Ve | Registra | No puede |
|---|---|---|---|
| Admin | Todo su hogar | Todo | Quedar el hogar sin admin |
| Cuidador | Todo su hogar | Eventos, salud, dudas | Cambiar ajustes, roles, invitar |
| Limitado | Sueño, tomas y pañales de hoy o en curso | Sueño, tomas, pañales | Ver salud, días anteriores, invitaciones; registrar a nombre de otro |
| Ajeno | Nada | Nada | — |

## Hito 2: terminado cuando…
- [x] Entrar con correo: código de 6 dígitos (sirve en la PWA instalada) o enlace del correo
- [ ] Entrar con Google (pendiente: cliente OAuth de Google)
- [x] Alta en 5 pasos: hogar (tu nombre, zona, unidades), bebé (edad corregida si nació antes de las 37 semanas), sueño seguro, invitar, Claude
- [x] Invitar con rol: enlace de un solo uso, 7 días, ligado al correo; se comparte por WhatsApp o correo
- [x] Aceptar invitación: muestra hogar, quién invita y rol; rechaza otro correo, vencida o ya usada
- [x] Más › Cuidadores: personas, roles e invitaciones pendientes (solo admin)
- [x] Probado contra la base (como usuario real con RLS): crear hogar y bebé, invitar, ver y aceptar, reusar token y otro correo
- [x] e2e públicos 16/16; e2e con sesión escritos (`tests/e2e/onboarding.spec.ts`), en pausa hasta tener red a Supabase desde el entorno
- [ ] Probado en el preview de punta a punta (después de los 2 ajustes de abajo)

## Hito 3: avance
- [x] Lógica de core.js portada a TypeScript con pruebas (33): horas en la zona del hogar, unidades (lb y oz), sueño por día, predictor, alarmas
- [x] Hoy: estado como héroe (despierta, durmiendo, toma de pecho por lado), accesos rápidos, estimación con «¿Por qué esta franja?», lista del día
- [x] Hojas de registro: sueño, toma (pecho, biberón, sólidos, extracción), pañal, medicamento, temperatura o síntoma, nota; detalle con edición y conflicto
- [x] Deshacer en vez de confirmar (7 s con Deshacer, 4 s sin)
- [x] Modo noche automático por horario del hogar e interruptor por dispositivo
- [x] Barra inferior (móvil) y lateral (escritorio); manifiesto e íconos de la PWA
- [x] Flujo de temporizadores probado contra la base (iniciar, cambiar lado, cerrar, deshacer, duplicados, versión)
- [x] Deploy del preview listo (READY)
- [ ] Probado en el teléfono (necesita los ajustes de Supabase de abajo)

## Hito 4: Diario y análisis
- [x] Diario: línea de 24 h con bloques de noche y siesta, eventos agrupados, línea de «ahora», tira de la semana y navegación por días
- [x] Detalle y edición desde el Diario (misma hoja que Hoy: horas, campos, quién y desde dónde, eliminar con deshacer, conflicto)
- [x] Patrones semanales: bandas por día y horas en 24 h contra la referencia por edad; semanas anteriores
- [x] Resumen hoy, 7 y 30 días: sueño (noche, siestas, despertares), tomas (pecho por lado, biberón), pañales
- [x] Estadísticas portadas a TS con pruebas (35 en total)
- [ ] Probado en el teléfono (necesita los ajustes de Supabase)

## Hito 5: Salud
- [x] Curvas OMS oficiales (tablas LMS por día, 0–24 meses, del paquete oficial `WorldHealthOrganization/anthro`; GPL-3 el código, datos de la OMS) en `src/data/who/oms.json`; percentil con la fórmula LMS y el ajuste de la OMS fuera de ±3; edad corregida
- [x] Crecimiento: gráfica P3/P50/P97 con banda P15–P85 y los puntos del bebé; tabla con percentiles; peso en lb y oz con kg al lado
- [x] Medicamentos: tratamientos activos con la indicación textual, terminar con deshacer, historial de dosis (solo registra; nunca calcula ni sugiere)
- [x] Pediatra: visitas con notas, vacunas y adjuntos en Storage privado (`visitas/{hogar}/{visita}/…`, enlaces firmados de 5 minutos), próxima cita
- [x] Dudas para la consulta: agregar, resolver en una visita, volver a pendiente
- [x] Resumen para el pediatra: desde la última visita o una fecha; crecimiento, sueño, tomas, pañales, medicamentos, síntomas y dudas; imprimir o compartir
- [x] Pruebas: 42 en verde (percentiles contra valores publicados de la OMS, resumen)
- [ ] Probado en el teléfono (necesita la configuración de `CONFIGURACION.md`)

## Hito 6: servidor MCP
- [x] `/api/mcp` (Streamable HTTP, `mcp-handler`) con `withMcpAuth`: 401 + `WWW-Authenticate` con `resource_metadata`
- [x] `/.well-known/oauth-protected-resource` (y `/api/mcp`): recurso exacto y servidor de autorización de Supabase
- [x] Validación del token contra el JWKS (ES256) de Supabase; exige `client_id` (una sesión del navegador no sirve) y aplica RLS con el token del usuario. Sin llave secreta
- [x] 27 herramientas: estado, temporizadores, registrar, corregir (con versión y CONFLICTO), eliminar/deshacer, consultar, resumen, analizar período, predicción, medidas con percentil, medicamentos (solo registra), tratamientos, dudas, cita, resumen para el pediatra, configuración (anterior → nuevo y cómo revertir), invitar
- [x] Horas en lenguaje natural con aviso cuando se desambigua; volúmenes en la unidad del hogar
- [x] Auditoría por llamada en `mcp_audit` (herramienta, resultado y código; sin argumentos ni datos de salud)
- [x] `/oauth/consent`: cliente, destino, qué podrá hacer según tu rol, Permitir / No permitir; solo devuelve a claude.ai, claude.com o loopback
- [x] Más › Conexión con Claude: cómo conectarla, tus conexiones con último uso y Revocar (revoca el permiso en Supabase y bloquea al instante los tokens vigentes)
- [x] Pruebas de integración contra la base real (`pnpm test:integracion`): 8/8, incluidos permisos del rol limitado y conflicto de versión
- [ ] Conector agregado en Claude y probado con las 5 frases (falta «Save changes» en Supabase › Authentication › OAuth Server)

## Hito 7: robustez
- [x] Cola sin red: crear registros y «Despertó» se guardan en el teléfono con `client_op_id`, se ven en Hoy con «N por enviar» y se reenvían solos al volver la red (sin duplicar; solo los envía la misma persona que los guardó)
- [x] Service worker: la app abre sin red con la última copia de Hoy; la copia se borra al cerrar sesión
- [x] Conflictos: hoja de conflicto con ambas versiones (desde el Hito 3) y CONFLICTO en el MCP
- [x] Accesibilidad WCAG 2.1 AA con axe en 12 pantallas, modo Día y Noche: 0 violaciones
- [x] Más › Tus datos: exportar CSV (abre en Excel/Sheets) y JSON completo; eliminar cuenta con confirmación (borrado real: si eres el único miembro se borran hogar, bebés, registros, salud y adjuntos; si compartes el hogar tus registros quedan para la familia; el último admin de un hogar compartido primero debe nombrar a otro)
- [x] Playwright: flujos de los capítulos del recorrido (primeros minutos, primer día con temporizadores y deshacer, modo noche, Diario y salud, sin red); «Diego desde Claude» cubierto por las pruebas de integración del MCP
- [x] Todo en verde antes de publicar: lint, typecheck, 52 unitarias, 8 de integración MCP, 42 e2e en móvil y escritorio
- [x] Publicado en producción (`main`, a39ad40): `/api/salud` conectado, `/api/mcp` responde 401 con metadatos OAuth correctos; 16 e2e de navegador pasan contra producción

## Pendientes manuales tuyos
- **Supabase › Authentication › OAuth Server: presiona «Save changes».** Los interruptores se ven encendidos, pero el servidor sigue respondiendo «OAuth server is disabled». Sin esto Claude no puede conectarse.
- Supabase › Authentication › Providers › Google: confirma que presionaste «Save» (Google ya está activado en la pantalla de entrar).
- Supabase › Authentication › Emails: si no lo hiciste, pega `supabase/templates/codigo.html` en «Magic Link» y «Confirm signup» para que el correo traiga el código de 6 dígitos.
- JWT Keys: ya está bien (llave ECC P-256 vigente). No hay que hacer nada más ahí.
- Datos de ejemplo: el hogar «Casa de Lucía» y los usuarios `@ejemplo.tereza.test` siguen en la base para las pruebas. Están aislados por RLS (nadie más los ve). Cuando quieras quitarlos, corre el bloque final de `supabase/seed/ejemplo.sql` (no lo hice yo porque borra datos).
- Antes de datos reales: borrar el ejemplo (instrucciones al final de `supabase/seed/ejemplo.sql`) y transferir el proyecto de Vercel a una cuenta personal.

## Riesgos abiertos
- Redirect URIs de loopback con puerto aleatorio en el OAuth de Supabase (se prueba en el Hito 6).
- Servidor OAuth de Supabase en beta.
