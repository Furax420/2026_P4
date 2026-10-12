const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const settings = JSON.parse(
  fs.readFileSync(path.join(root, ".nycrc.json"), "utf8"),
);
const summaryPath = path.join(
  root,
  settings["report-dir"],
  "coverage-summary.json",
);

try {
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const reported = new Set(
    Object.keys(summary)
      .filter((file) => file !== "total")
      .map((file) => path.resolve(file).toLowerCase()),
  );
  function sourceFiles(directory) {
    return fs
      .readdirSync(directory, { withFileTypes: true })
      .flatMap((entry) => {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory())
          return entry.name === "types" ? [] : sourceFiles(file);
        return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")
          ? [file]
          : [];
      });
  }
  // An unvisited source file must not silently disappear from the coverage denominator.
  const missing = sourceFiles(path.join(root, "src")).filter(
    (file) => !reported.has(file.toLowerCase()),
  );
  if (missing.length)
    throw new Error(
      "Source files missing from the E2E report: " +
        missing.map((file) => path.relative(root, file)).join(", "),
    );
  for (const metric of ["statements", "branches", "functions", "lines"]) {
    const actual = summary.total[metric].pct;
    const expected = settings[metric];
    console.log(`${metric}: ${actual}% (required: ${expected}%)`);
    if (typeof actual !== "number" || actual < expected) process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
