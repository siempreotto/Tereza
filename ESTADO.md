# Estado de Tereza

**Hito actual:** 0. Infraestructura (terminado; esperando tu visto bueno para el Hito 1)
**Rama:** `claude/hito-0-infra`
**Último preview:** https://tereza-git-claude-hito-0-infra-sento-product.vercel.app (pide entrar con tu cuenta de Vercel del equipo Sento Product)

## Hito 0: terminado cuando…
- [x] Repo creado y con scaffold de Next.js 16 (TS estricto, ESLint, Vitest, Playwright, pnpm)
- [x] Tokens y estilos de Tereza en `src/styles/`; componentes del sistema de diseño portados a `src/components/tz/`
- [x] Página de salud (`/`) y `GET /api/salud` (estado sin datos de salud ni secretos)
- [x] Lint, typecheck, unit tests (3) y e2e (4, móvil y escritorio) en verde
- [x] Proyecto Supabase `tereza` creado (ref `jkqwlczjqoqmxhatqfad`, us-east-1, org OttoSento)
- [x] Proyecto Vercel `tereza` (equipo Sento Product) vinculado al repo; producción desde `main`
- [x] Variables públicas cargadas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- [x] Preview desplegado: `/api/salud` responde 200 con «Supabase: conectado»

## Pendientes manuales tuyos
- Antes del Hito 2: copiar la llave secreta de Supabase (Project Settings › API Keys › Secret keys) a Vercel como `SUPABASE_SECRET_KEY`, tipo «Sensitive», solo Production y Preview. El MCP de Supabase no entrega llaves secretas, a propósito.

## Riesgos abiertos
- Redirect URIs de loopback con puerto aleatorio en el OAuth de Supabase (se prueba en el Hito 6).
- Servidor OAuth de Supabase en beta.
