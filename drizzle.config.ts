import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});