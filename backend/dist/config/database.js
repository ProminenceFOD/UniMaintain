"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
let pool;
if (process.env.MOCK_DB === "true") {
    console.log("⚠️ Running in Mock DB mode");
    // Resolve mock DB path for compiled environment
    const mockPathCompiled = path_1.default.join(__dirname, "__mocks__/database");
    // Fallback to source path (useful during dev with ts-node)
    const mockPathSource = path_1.default.resolve(process.cwd(), "src/config/__mocks__/database");
    try {
        pool = require(mockPathCompiled).default;
    }
    catch (e) {
        pool = require(mockPathSource).default;
    }
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
