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
}

let _rawClient: any = null;

export function getRawClient() {
  if (_rawClient) return _rawClient;
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    _rawClient = new Pool({ connectionString: databaseUrl });
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

export const db = getDb();
