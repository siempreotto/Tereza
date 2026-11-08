import { revisarSalud } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const salud = await revisarSalud();
  return Response.json(salud, { status: salud.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
