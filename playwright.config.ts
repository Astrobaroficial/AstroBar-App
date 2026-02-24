import { defineConfig } from "@playwright/test";

const baseURL =
  process.env.BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

export default defineConfig({
  testDir: ".",
  testMatch: "e2e.spec.ts",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL,
  },
});
