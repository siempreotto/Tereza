// Edad para mostrar (port de ageParts/ageText de referencia/prototipo/core.js), con edad corregida.
const DIA = 86_400_000;

export function edadTexto(fechaNacimiento: string, ahora: Date = new Date(), semanasGestacion?: number | null): string {
  const real = textoDesde(new Date(`${fechaNacimiento}T12:00:00`), ahora);
  if (!semanasGestacion || semanasGestacion >= 37) return real;
  const corrida = new Date(new Date(`${fechaNacimiento}T12:00:00`).getTime() + (40 - semanasGestacion) * 7 * DIA);
  if (corrida > ahora) return `${real} (aún no cumple su fecha probable de parto)`;
  const meses = mesesEntre(corrida, ahora);
  if (meses >= 24) return real;
  return `${real} · corregida ${textoDesde(corrida, ahora)}`;
}

function mesesEntre(desde: Date, hasta: Date): number {
  let m = (hasta.getFullYear() - desde.getFullYear()) * 12 + hasta.getMonth() - desde.getMonth();
  const ref = new Date(desde);
  ref.setMonth(desde.getMonth() + m);
  if (ref > hasta) m--;
  return m;
}

function textoDesde(desde: Date, hasta: Date): string {
  const m = mesesEntre(desde, hasta);
  if (m < 1) {
    const d = Math.max(0, Math.floor((hasta.getTime() - desde.getTime()) / DIA));
    return d === 1 ? "1 día" : `${d} días`;
  }
  if (m < 24) return m === 1 ? "1 mes" : `${m} meses`;
  const a = Math.floor(m / 12);
  return a === 1 ? "1 año" : `${a} años`;
}
