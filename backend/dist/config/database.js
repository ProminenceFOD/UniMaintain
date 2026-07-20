"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let pool;
if (process.env.MOCK_DB === "true") {
    console.log("⚠️ Running in Mock DB mode");
    // Load mock database dynamically to avoid circular dependencies
    pool = require("./__mocks__/database").default;
}
else {
    pool = new pg_1.Pool({
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432"),
        database: process.env.DB_NAME || "unimaintain",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
        // SSL required for Supabase and most cloud PostgreSQL providers
        ssl: (process.env.DB_HOST?.includes("supabase.co") || process.env.DB_HOST?.includes("supabase.com"))
            ? { rejectUnauthorized: false }
            : false,
    });
    pool.on("connect", () => console.log("✅ PostgreSQL connected"));
    pool.on("error", (err) => console.error("❌ PostgreSQL error:", err.message));
}
exports.default = pool;
