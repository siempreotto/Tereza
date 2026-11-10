import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { destinoSeguro } from "@/lib/auth/next";

// Destino del enlace del correo: acepta ?code (PKCE) o ?token_hash&type (plantilla con TokenHash).
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = destinoSeguro(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const db = await supabaseServer();
  let ok = false;
  if (code) ok = !(await db.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await db.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  const destino = new URL(ok ? next : `/entrar?error=enlace${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`, url.origin);
  return NextResponse.redirect(destino);
}
