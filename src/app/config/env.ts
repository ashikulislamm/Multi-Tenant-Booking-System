import dotenv from 'dotenv';
import { z } from 'zod';
// Load .env file
dotenv.config();
const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long').default('super_secret_test_key_at_least_32_characters_long'),
  JWT_EXPIRY: z.string().default('24h'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}
export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;