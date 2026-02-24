import fs from "fs";
import path from "path";
import { ensureTestSchema, connection } from "../server/db";

type MaybePool = { end?: () => Promise<void> | void } | null | undefined;

async function runSeedSql() {
  const seedPath = path.join(process.cwd(), "create-test-data.sql");
  if (!fs.existsSync(seedPath)) {
    return;
  }

  const rawSql = fs.readFileSync(seedPath, "utf8");
  const statements = rawSql
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("--"))
    .join("\n")
    .split(";")
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);

  for (const statement of statements) {
    await connection.query(statement);
  }
}

beforeAll(async () => {
  if (process.env.NODE_ENV !== "test") {
    return;
  }

  if (process.env.USE_DB_STUBS === "true") {
    return;
  }

  await ensureTestSchema();
  await runSeedSql();
});

afterAll(async () => {
  if (process.env.USE_DB_STUBS === "true") {
    return;
  }

  const pool = connection as MaybePool;
  if (pool?.end) {
    await pool.end();
  }
});
