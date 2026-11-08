"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

// Cliente del navegador con la llave publicable. Nunca la llave secreta aquí.
export const supabaseBrowser = () => createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
