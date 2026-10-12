const fs = require("node:fs");
const path = require("node:path");

try {
  const part = process.argv[2];
  if (!["frontend", "backend"].includes(part))
    throw new Error("Choose frontend or backend");
  const report =
    part === "frontend"
      ? "coverage/vitest/test-results.json"
      : "coverage/test-results.json";
  const result = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "..", part, report), "utf8"),
  );
  if (result.numFailedTests || result.numPendingTests || !result.numPassedTests)
    throw new Error("All tests must run and pass before checking their ratio");
  // Count actual executed cases, including each row of parameterized tests.
  let total = 0;
  let integration = 0;
  for (const suite of result.testResults) {
    const passed = suite.assertionResults.filter(
      (test) => test.status === "passed",
    ).length;
    total += passed;
    if (suite.name.replaceAll("\\", "/").includes("/tests/integration/"))
      integration += passed;
  }
  if (total !== result.numPassedTests)
    throw new Error("Report case counts are inconsistent");
  const ratio = (integration / total) * 100;
  console.log(
    `${part}: ${integration}/${total} integration cases (${ratio.toFixed(2)}%; required: 30%)`,
  );
  if (ratio < 30) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
