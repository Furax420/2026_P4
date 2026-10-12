import { createRequire } from "node:module";
import { defineConfig } from "cypress";

const require = createRequire(import.meta.url);
const { resetE2eFixtures } = require("../backend/scripts/e2e-fixtures.cjs") as {
  resetE2eFixtures: () => Promise<{ adminId: number; userId: number; teacherId: number; sessionId: number }>;
};

const registerCoverage = require("@cypress/code-coverage/task") as (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
) => void;

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    testIsolation: true,
    setupNodeEvents(on, config) {
      registerCoverage(on, config);
      // Database preparation runs in Node, never in the browser or the public API.
      on("task", { resetE2eFixtures });
      return config;
    },
  },
  video: false,
});
