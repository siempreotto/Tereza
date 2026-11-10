// Zonas horarias ofrecidas al crear el hogar (Latinoamérica primero). Se guardan como nombre IANA.
export const ZONAS = [
  { id: "America/Guatemala", l: "Guatemala" },
  { id: "America/El_Salvador", l: "El Salvador" },
  { id: "America/Tegucigalpa", l: "Honduras" },
  { id: "America/Managua", l: "Nicaragua" },
  { id: "America/Costa_Rica", l: "Costa Rica" },
  { id: "America/Panama", l: "Panamá" },
  { id: "America/Mexico_City", l: "México (centro)" },
  { id: "America/Bogota", l: "Colombia" },
  { id: "America/Lima", l: "Perú" },
  { id: "America/Guayaquil", l: "Ecuador" },
  { id: "America/Caracas", l: "Venezuela" },
  { id: "America/Santo_Domingo", l: "República Dominicana" },
  { id: "America/Santiago", l: "Chile" },
  { id: "America/Argentina/Buenos_Aires", l: "Argentina" },
  { id: "America/New_York", l: "Estados Unidos (este)" },
  { id: "America/Los_Angeles", l: "Estados Unidos (pacífico)" },
  { id: "Europe/Madrid", l: "España" },
] as const;

export function zonaDelDispositivo(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return ZONAS.some((z) => z.id === tz) ? tz : "America/Guatemala";
  } catch {
    return "America/Guatemala";
  }
}
