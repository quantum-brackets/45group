import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
  dotenv.config({ path: ".env.local" });
} else {
  dotenv.config({ path: ".env" });
}

export default defineConfig({
  schema: "./src/db/schemas",
  dialect: "postgresql",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
