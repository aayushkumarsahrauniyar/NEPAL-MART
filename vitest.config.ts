import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for the Nepal Mart unit tests.
 * Tests live next to the code they cover in `__tests__` folders.
 * The `@/*` alias mirrors `tsconfig.json` so tests import modules exactly
 * the way the application does.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "functions", "out"],
    reporters: "default",
    clearMocks: true,
    restoreMocks: true,
  },
});
