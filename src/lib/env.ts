// Variables públicas. Faltan en local hasta copiar .env.example a .env.local.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const supabaseConfigured = () => Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
