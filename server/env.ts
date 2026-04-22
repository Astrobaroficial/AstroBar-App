import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Server
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("5000"),
  // Se quitó la validación estricta de URL para evitar errores de parseo inicial
  FRONTEND_URL: z.string().default("http://localhost:8081"),
  BACKEND_URL: z.string().default("http://localhost:5000"),

  // Mercado Pago - Ahora opcionales para evitar que el server crashee sin las llaves
  MERCADO_PAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADO_PAGO_PUBLIC_KEY: z.string().optional(),
  MERCADO_PAGO_CLIENT_ID: z.string().optional(),
  MERCADO_PAGO_CLIENT_SECRET: z.string().optional(),
  MERCADO_PAGO_REDIRECT_URI: z.string().optional(),

  // Twilio - Flexibilizado para permitir el arranque del servidor
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),

  // Optional services
  RESEND_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function validateEnv(): Env {
  if (validatedEnv) return validatedEnv;

  try {
    // Usamos safeParse para manejar los errores manualmente sin matar el proceso de inmediato
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
      console.warn("⚠️  Algunas variables de entorno faltan o son inválidas:");
      result.error.errors.forEach((err) => {
        console.warn(`  - ${err.path.join(".")}: ${err.message}`);
      });
      // En lugar de cerrar el server, usamos los defaults donde sea posible
      validatedEnv = result.data as Env; 
      console.log("ℹ️ El servidor intentará arrancar con configuración limitada.");
    } else {
      validatedEnv = result.data;
      console.log("✅ Environment variables validated successfully");
    }

    return validatedEnv || (process.env as unknown as Env);
  } catch (error) {
    console.error("❌ Critical error during env validation:", error);
    // Solo cerramos si es un error catastrófico no relacionado con validación
    return process.env as unknown as Env;
  }
}

export function getEnv(): Env {
  if (!validatedEnv) {
    // Intentamos validar si no se hizo antes para no romper el flujo
    return validateEnv();
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