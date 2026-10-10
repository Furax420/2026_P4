import { createRequire } from "node:module";
import { defineConfig } from "cypress";

const require = createRequire(import.meta.url);

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
      return config;
    },
  },
  video: false,
});
