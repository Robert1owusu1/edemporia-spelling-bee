import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    // The database URL is now defined here, under the 'datasource' block
    url: process.env.DATABASE_URL!,
  },
});
