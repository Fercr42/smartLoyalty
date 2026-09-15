import { defineConfig } from "vitest/config";

// Pruebas contra el sitio publicado (E2E_BASE_URL). Crean restaurantes "zzE2E…" y los borran al final.
// Necesitan FIREBASE_SERVICE_ACCOUNT y NEXT_PUBLIC_FIREBASE_API_KEY (en .env.local o en GitHub).
export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/e2e/setup.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
