import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Native replacement for vite-tsconfig-paths: resolves the `@/*` alias
  // straight from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Playwright specs live in e2e/ and are run by `npm run test:e2e`.
    exclude: ["node_modules", ".next", "e2e"],
    css: false,
    // The config modules validate these on import, so tests need them defined.
    // Values are deliberately fake — MSW intercepts every request.
    env: {
      NEXT_PUBLIC_APP_NAME: "Test App",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_API_URL: "http://localhost:4000/api/v1",
      NEXT_PUBLIC_API_MODE: "direct",
      API_URL: "http://localhost:4000/api/v1",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/framework/**", "src/components/**", "src/lib/**", "src/hooks/**"],
      exclude: ["src/components/ui/**", "**/*.test.{ts,tsx}", "src/test/**"],
    },
  },
});
