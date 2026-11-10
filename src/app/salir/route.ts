import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// POST para que un enlace o un prefetch no cierre la sesión por accidente.
export async function POST(request: NextRequest) {
  const db = await supabaseServer();
  await db.auth.signOut();
  return NextResponse.redirect(new URL("/entrar", request.nextUrl.origin), { status: 303 });
}
