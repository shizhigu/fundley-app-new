import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

// Disable prefetch as it is not supported for "Transaction" pool mode
export const client = postgres(process.env.POSTGRES_URL, { prepare: false });

export const db = drizzle(client);