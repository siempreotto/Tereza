# Estado de Tereza

**Hito actual:** 0. Infraestructura (en curso)
**Rama:** `claude/hito-0-infra`
**Último preview:** pendiente (falta crear el proyecto de Vercel)

## Hito 0: terminado cuando…
- [x] Repo creado y con scaffold de Next.js 16 (TS estricto, ESLint, Vitest, Playwright, pnpm)
- [x] Tokens y estilos de Tereza en `src/styles/`; componentes del sistema de diseño portados a `src/components/tz/`
- [x] Página de salud (`/`) y `GET /api/salud` (estado sin datos de salud ni secretos)
- [x] Lint, typecheck, unit tests (3) y e2e (4, móvil y escritorio) en verde
- [ ] Proyecto Supabase `tereza` (us-east-1, org OttoSento), con tu OK al costo
- [ ] Proyecto Vercel vinculado al repo y variables cargadas (públicas y secreta por separado)
- [ ] Preview desplegado que responde `/api/salud` con «Supabase: conectado»

## Pendientes manuales tuyos
- Aprobar el costo del proyecto de Supabase cuando aparezca la confirmación.

## Riesgos abiertos
- Redirect URIs de loopback con puerto aleatorio en el OAuth de Supabase (se prueba en el Hito 6).
- Servidor OAuth de Supabase en beta.
