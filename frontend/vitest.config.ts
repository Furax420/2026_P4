import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./tests/setup.ts"],
      include: ["tests/**/*.test.{ts,tsx}"],
      clearMocks: true,
      restoreMocks: true,
      coverage: {
        provider: "v8",
        reportsDirectory: "coverage/vitest",
        reporter: ["text", "html", "lcov", "json-summary"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.d.ts", "src/types/**"],
        thresholds: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
  }),
);
