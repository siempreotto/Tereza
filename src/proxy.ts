import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresca la sesión de Supabase en cada request y manda a /entrar a quien no la tenga.
// Es un chequeo optimista: cada página y acción vuelve a validar al usuario en el servidor.
const PUBLICAS = ["/entrar", "/salud", "/api/salud"];
const PREFIJOS_PUBLICOS = ["/auth/", "/invitacion/", "/.well-known/", "/oauth/", "/api/mcp"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const publica = PUBLICAS.includes(path) || PREFIJOS_PUBLICOS.some((p) => path.startsWith(p));
  if (!data.user && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = path === "/" ? "" : `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest).*)"],
};
