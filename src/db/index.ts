import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schemas";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  prepare: false,
  max: process.env.NODE_ENV === "production" ? 20 : 10,
  idle_timeout: process.env.NODE_ENV === "production" ? 60 : 30,
  connect_timeout: 10,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : false,
  keep_alive: process.env.NODE_ENV === "production" ? 30 : null,
});

export const db = drizzle(client, { schema });
