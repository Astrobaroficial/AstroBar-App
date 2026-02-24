if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}

if (!process.env.DOTENV_CONFIG_PATH) {
  process.env.DOTENV_CONFIG_PATH = ".env.local";
}

if (!process.env.DB_CHARSET) {
  process.env.DB_CHARSET = "utf8mb4";
}
