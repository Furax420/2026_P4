const { spawnSync } = require("node:child_process");
const path = require("node:path");

// E2E requests use a separate API and the same isolated database as API tests.
const result = spawnSync(
  process.execPath,
  ["-r", "ts-node/register", "src/server.ts"],
  {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: "8081",
      JWT_SECRET: "yoga-test-secret",
      DATABASE_URL:
        "postgresql://yogatest:yogatest@localhost:5433/yogastudio_test?schema=public",
    },
  },
);
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
