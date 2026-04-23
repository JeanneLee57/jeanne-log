import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  INTERNAL_API_TOKEN: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  throw new Error(`Invalid environment configuration: ${parsedEnvironment.error.message}`);
}

export const env = parsedEnvironment.data;

export function requireDatabaseUrl() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return env.DATABASE_URL;
}

export function requireInternalApiToken() {
  if (!env.INTERNAL_API_TOKEN) {
    throw new Error("INTERNAL_API_TOKEN is not configured.");
  }

  return env.INTERNAL_API_TOKEN;
}
