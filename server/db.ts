import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create the postgres client
const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
});

// Create the drizzle database instance
export const db = drizzle(client, { schema });

// Export the schema for convenience
export * from "@shared/schema";