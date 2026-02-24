import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Server
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("5000"),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
  BACKEND_URL: z.string().url("BACKEND_URL must be a valid URL"),

  // Stripe (Required)
  STRIPE_SECRET_KEY: z
    .string()
    .startsWith("sk_", "STRIPE_SECRET_KEY must start with sk_"),
  STRIPE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_", "STRIPE_PUBLISHABLE_KEY must start with pk_"),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .startsWith("whsec_", "STRIPE_WEBHOOK_SECRET must start with whsec_"),

  // Twilio (Required)
  TWILIO_ACCOUNT_SID: z
    .string()
    .startsWith("AC", "TWILIO_ACCOUNT_SID must start with AC"),
  TWILIO_AUTH_TOKEN: z.string().min(1, "TWILIO_AUTH_TOKEN is required"),
  TWILIO_PHONE_NUMBER: z
    .string()
    .startsWith("+", "TWILIO_PHONE_NUMBER must start with +"),
  TWILIO_VERIFY_SERVICE_SID: z
    .string()
    .startsWith("VA", "TWILIO_VERIFY_SERVICE_SID must start with VA"),

  // Optional services
  RESEND_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function validateEnv(): Env {
  if (validatedEnv) return validatedEnv;

  try {
    validatedEnv = envSchema.parse(process.env);
    console.log("✅ Environment variables validated successfully");
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment validation failed:");
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      console.error("\n📋 Required environment variables:");
      console.error(
        "  DATABASE_URL, STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY,",
      );
      console.error(
        "  STRIPE_WEBHOOK_SECRET, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,",
      );
      console.error("  TWILIO_PHONE_NUMBER, TWILIO_VERIFY_SERVICE_SID,");
      console.error("  FRONTEND_URL, BACKEND_URL");
      process.exit(1);
    }
    throw error;
  }
}

export function getEnv(): Env {
  if (!validatedEnv) {
    throw new Error("Environment not validated. Call validateEnv() first.");
  }
  return validatedEnv;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === "production";
}

export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === "development";
}

export function isTest(): boolean {
  return getEnv().NODE_ENV === "test";
}
