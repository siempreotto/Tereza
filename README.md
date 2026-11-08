# Tereza

Web app (PWA, mobile first) para registrar el día de un bebé, con un servidor MCP remoto para usarla desde Claude.

- Plan aprobado: [`PLAN.md`](PLAN.md). Estado actual: [`ESTADO.md`](ESTADO.md).
- Referencia (brief, prototipo validado y sistema de diseño): [`referencia/`](referencia/). No se ejecuta en producción.

## Desarrollo

```bash
pnpm install
cp .env.example .env.local   # y completar las variables
pnpm dev
```

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest) y `pnpm test:e2e` (Playwright; en móvil y escritorio).
- Para ver el prototipo: `npx serve referencia/prototipo` y abrir `/#recorrido`.
