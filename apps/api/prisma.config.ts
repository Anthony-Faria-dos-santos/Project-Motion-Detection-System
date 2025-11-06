import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env from monorepo root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // For schema management (db push, migrate): use DIRECT_URL (session mode, no pgbouncer)
    // For runtime queries: Prisma Client uses DATABASE_URL from schema.prisma
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
