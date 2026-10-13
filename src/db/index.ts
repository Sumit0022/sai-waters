import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import * as schema from "./schema";
import path from "path";

// Global cache to maintain singleton DB instance across Next.js hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __db_instance: any;
  // eslint-disable-next-line no-var
  var __db_initialized: boolean;
}

let _rawClient: any = null;
let _initPromise: Promise<void> | null = null;

export function getRawClient() {
  if (_rawClient) return _rawClient;
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    _rawClient = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("sslmode=require") || databaseUrl.includes("neon.tech") || databaseUrl.includes("supabase.co")
        ? { rejectUnauthorized: false }
        : undefined,
    });
  } else {
    const dataDir = path.join(process.cwd(), "data", "pglite");
    const fs = require("fs");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    _rawClient = new PGlite(dataDir);
  }
  return _rawClient;
}

export function getDb() {
  if (global.__db_instance) {
    return global.__db_instance;
  }

  const raw = getRawClient();
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    const db = drizzlePg(raw, { schema });
    global.__db_instance = db;
    return db;
  } else {
    const db = drizzlePglite(raw, { schema });
    global.__db_instance = db;
    return db;
  }
}

export async function ensureDatabaseReady() {
  if (global.__db_initialized) return;
  if (!_initPromise) {
    const { initializeDatabase } = await import("./init");
    _initPromise = initializeDatabase()
      .then(() => {
        global.__db_initialized = true;
      })
      .catch((err) => {
        _initPromise = null;
        console.error("Auto DB initialization failed:", err);
        throw err;
      });
  }
  return _initPromise;
}

export const db = getDb();
