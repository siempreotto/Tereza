// Solo rutas internas: evita redirigir a otro dominio con ?next=https://…
export function destinoSeguro(next: string | null | undefined, porDefecto = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return porDefecto;
  return next;
}
