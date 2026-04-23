import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { requireDatabaseUrl } from "@/lib/env";
import * as schema from "@/db/schema";

declare global {
  var jeanneLogPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    connectionString: requireDatabaseUrl(),
  });
}

export function getPool() {
  if (!global.jeanneLogPool) {
    global.jeanneLogPool = createPool();
  }

  return global.jeanneLogPool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export type Database = ReturnType<typeof getDb>;
