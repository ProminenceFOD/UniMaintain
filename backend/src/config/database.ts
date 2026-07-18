import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

let pool: any;

if (process.env.MOCK_DB === "true") {
  console.log("⚠️ Running in Mock DB mode");
  // Load mock database dynamically to avoid circular dependencies
  pool = require("./__mocks__/database").default;
} else {
  pool = new Pool({
    host:     process.env.DB_HOST     || "localhost",
    port:     parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME     || "unimaintain",
    user:     process.env.DB_USER     || "postgres",
    password: process.env.DB_PASSWORD || "",
    // SSL required for Supabase and most cloud PostgreSQL providers
    ssl: process.env.DB_HOST?.includes("supabase.co")
      ? { rejectUnauthorized: false }
      : false,
  });

  pool.on("connect", () => console.log("✅ PostgreSQL connected"));
  pool.on("error",   (err: any) => console.error("❌ PostgreSQL error:", err.message));
}

export default pool;
