const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

// Headless Cypress merges coverage across specs. Clear the previous run, not each spec.
// Fixed files only: no recursive deletion or database operation is needed.
for (const file of [
  ".nyc_output/e2e/out.json",
  "coverage/e2e/coverage-summary.json",
  "coverage/e2e/index.html",
]) {
  fs.rmSync(path.join(root, file), { force: true });
}
