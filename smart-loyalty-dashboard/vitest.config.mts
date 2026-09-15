import { defineConfig } from "vitest/config";

// Pruebas rápidas (sin internet): lógica pura de app/lib.
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
