import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

let pool: any;

if (process.env.MOCK_DB === "true") {
  console.log("⚠️ Running in Mock DB mode");
  // Resolve mock DB path for compiled environment
  const mockPathCompiled = path.join(__dirname, "__mocks__/database");
  // Fallback to source path (useful during dev with ts-node)
  const mockPathSource = path.resolve(process.cwd(), "src/config/__mocks__/database");
  try {
    pool = require(mockPathCompiled).default;
  } catch (e) {
    pool = require(mockPathSource).default;
  }
} else {
  pool = new Pool({
    host:     process.env.DB_HOST     || "localhost",
    port:     parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME     || "unimaintain",
    user:     process.env.DB_USER     || "postgres",
    password: process.env.DB_PASSWORD || "",
    // SSL required for Supabase and most cloud PostgreSQL providers
    ssl: (process.env.DB_HOST?.includes("supabase.co") || process.env.DB_HOST?.includes("supabase.com"))
      ? { rejectUnauthorized: false }
      : false,
  });

  pool.on("connect", () => console.log("✅ PostgreSQL connected"));
  pool.on("error",   (err: any) => console.error("❌ PostgreSQL error:", err.message));
}

export default pool;

