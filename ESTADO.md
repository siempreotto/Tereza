# Estado de Tereza

**Hito actual:** 1. Esquema y RLS (terminado; sigue el Hito 2)
**Rama:** `claude/hito-1-esquema`
**Último preview:** https://tereza-git-claude-hito-1-esquema-sento-product.vercel.app (pide entrar con tu cuenta de Vercel del equipo Sento Product)

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

## Pendientes manuales tuyos
- Antes del Hito 2: copiar la llave secreta de Supabase (Project Settings › API Keys › Secret keys) a Vercel como `SUPABASE_SECRET_KEY`, tipo «Sensitive», solo Production y Preview.
- Antes del Hito 2: cliente OAuth de Google (te diré dónde hacer clic).
- Antes de datos reales: borrar el ejemplo (instrucciones al final de `supabase/seed/ejemplo.sql`) y transferir el proyecto de Vercel a una cuenta personal.

## Riesgos abiertos
- Redirect URIs de loopback con puerto aleatorio en el OAuth de Supabase (se prueba en el Hito 6).
- Servidor OAuth de Supabase en beta.
