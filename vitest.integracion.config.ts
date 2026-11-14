import { defineConfig } from "vitest/config";
import path from "node:path";

// Pruebas de integración contra Supabase real (requieren .env.local con usuarios de ejemplo).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "server-only": path.resolve(import.meta.dirname, "tests/stubs/empty.ts") } },
  test: { include: ["tests/integracion/**/*.test.ts"], environment: "node", testTimeout: 30_000, fileParallelism: false },
});
