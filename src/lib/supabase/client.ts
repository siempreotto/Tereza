"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/lib/db/types";

// Cliente del navegador con la llave publicable. Nunca la llave secreta aquí.
export const supabaseBrowser = () => createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
