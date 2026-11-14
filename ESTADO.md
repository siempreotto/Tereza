# Estado de Tereza

**Hito actual:** 5. Salud (código listo)
**Rama:** `claude/hito-5-salud` (incluye los hitos anteriores)
**Último preview:** https://tereza-git-claude-hito-5-salud-sento-product.vercel.app
**Configuración pendiente:** ver `CONFIGURACION.md` (pide entrar con tu cuenta de Vercel del equipo Sento Product)

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

## Pendientes manuales tuyos
- **Para probar el acceso en el preview (5 minutos, en Supabase):**
  1. Authentication › URL Configuration: Site URL = `https://tereza-kappa.vercel.app`; en Redirect URLs agrega `https://tereza-*-sento-product.vercel.app/**` y `http://localhost:3000/**`.
  2. Authentication › Emails: en «Magic Link» y en «Confirm signup» pega `supabase/templates/codigo.html` (asunto: «Tu código para entrar a Tereza»). Así el correo trae el código de 6 dígitos.
- Más adelante: copiar la llave secreta de Supabase (Project Settings › API Keys › Secret keys) a Vercel como `SUPABASE_SECRET_KEY`, tipo «Sensitive», solo Production y Preview.
- Más adelante: cliente OAuth de Google para «Continuar con Google».
- Usuario de pruebas e2e `e2e@ejemplo.tereza.test` (contraseña en `.env.local`, fuera de git): borrarlo junto con el ejemplo antes de datos reales.
- Red del entorno de Claude: agregar `jkqwlczjqoqmxhatqfad.supabase.co` y `*.vercel.app` a Allowed domains para que corran los e2e con sesión.
- Antes de datos reales: borrar el ejemplo (instrucciones al final de `supabase/seed/ejemplo.sql`) y transferir el proyecto de Vercel a una cuenta personal.

## Riesgos abiertos
- Redirect URIs de loopback con puerto aleatorio en el OAuth de Supabase (se prueba en el Hito 6).
- Servidor OAuth de Supabase en beta.
