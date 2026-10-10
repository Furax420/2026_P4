const { spawnSync } = require("node:child_process");
const path = require("node:path");

const result = spawnSync(
  process.execPath,
  [require.resolve("prisma"), "migrate", "deploy"],
  {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL:
        "postgresql://yogatest:yogatest@localhost:5433/yogastudio_test?schema=public",
    },
  },
);

if (result.error) {
  console.error(result.error.message);
}

process.exitCode = result.status ?? 1;
