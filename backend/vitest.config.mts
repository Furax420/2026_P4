import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "yoga-test-secret",
      DATABASE_URL:
        "postgresql://yogatest:yogatest@localhost:5433/yogastudio_test?schema=public",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/dto/**", "src/types/**", "src/**/*.d.ts", "src/server.ts"],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
