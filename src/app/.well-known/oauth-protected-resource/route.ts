import { generateProtectedResourceMetadata, getPublicOrigin, metadataCorsOptionsRequestHandler } from "mcp-handler";
import { SUPABASE_URL } from "@/lib/env";

// Metadatos del recurso protegido (RFC 9728): el recurso es /api/mcp y los tokens los emite Supabase.
export function GET(req: Request) {
  const meta = generateProtectedResourceMetadata({
    authServerUrls: [`${SUPABASE_URL}/auth/v1`],
    resourceUrl: new URL("/api/mcp", getPublicOrigin(req)).toString(),
  });
  return Response.json(meta, { headers: { "Cache-Control": "max-age=3600", "Access-Control-Allow-Origin": "*" } });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
