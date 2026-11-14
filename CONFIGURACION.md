# Configuración manual (lo que no se puede hacer por MCP)

## 1. Red del entorno de Claude (para correr las pruebas con sesión)
Menú del entorno en la barra de título de la sesión › **Edit** › **Network access** › **Allowed domains** (deja marcada «Allow package managers»):
- `jkqwlczjqoqmxhatqfad.supabase.co`
- `*.vercel.app`

Guía: https://code.claude.com/docs/en/cloud-environments#network-access

## 2. Supabase — https://supabase.com/dashboard/project/jkqwlczjqoqmxhatqfad
1. **Authentication › URL Configuration**
   - Site URL: `https://tereza-kappa.vercel.app`
   - Redirect URLs: `https://tereza-*-sento-product.vercel.app/**`, `https://tereza-kappa.vercel.app/**`, `http://localhost:3000/**`
2. **Authentication › Emails › Templates**: en «Magic Link» y «Confirm signup» pega `supabase/templates/codigo.html`. Asunto: «Tu código para entrar a Tereza».
3. **Authentication › OAuth Server** (conector de Claude, Hito 6): activar OAuth 2.1 Server; Authorization Path `/oauth/consent`; activar Dynamic client registration.
4. **Project Settings › JWT Keys**: migrar a llaves asimétricas (ES256/RS256) si está disponible.
5. **Project Settings › API Keys › Secret keys**: copiar la llave `sb_secret_…` para Vercel.

## 3. Vercel — https://vercel.com/sento-product/tereza/settings/environment-variables
1. `SUPABASE_SECRET_KEY` = llave secreta de Supabase. Tipo «Sensitive», solo Production y Preview. Solo servidor; nunca en las herramientas MCP.
2. `NEXT_PUBLIC_APP_URL` = `https://tereza-kappa.vercel.app` (Production).
3. **Settings › Deployment Protection**: producción (`tereza-kappa.vercel.app`) debe quedar pública para que Claude llegue al conector; los previews pueden seguir protegidos.

## 4. Google (opcional)
Google Cloud Console › APIs & Services › Credentials › OAuth client ID (Web). Redirect URI: `https://jkqwlczjqoqmxhatqfad.supabase.co/auth/v1/callback`. Pega Client ID y Secret en Supabase › Authentication › Providers › Google.

## Antes de cargar datos reales
- Borrar el hogar de ejemplo y los usuarios `@ejemplo.tereza.test` (instrucciones al final de `supabase/seed/ejemplo.sql`).
- Transferir el proyecto de Vercel a una cuenta personal (hoy está en el equipo Sento Product).
