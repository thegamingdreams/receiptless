import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

export const runtime = "nodejs";

// If DB_PATH points to Render persistent disk, that mount may NOT exist during build.
// So we must NOT open SQLite at import-time.
const isBuildPhase = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;

// Choose DB path
const dbPath = process.env.DB_PATH || path.join(process.cwd(), "receiptless.db");

let _db: Database.Database | null = null;

function initDb() {
  if (_db) return _db;

  // Don't initialize DB during `next build`
  if (isBuildPhase) {
    throw new Error("DB initialization attempted during build phase");
  }

  // Ensure folder exists (only at runtime)
  const dir = path.dirname(dbPath);
  if (dir && dir !== "." && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Base table (create if missing)
  db.exec(`
    CREATE TABLE IF NOT EXISTS proofs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      publicId TEXT UNIQUE NOT NULL,
      merchant TEXT,
      item TEXT,
      proofHash TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Helper: run ALTER TABLE safely
  function tryAlter(sql: string) {
    try {
      db.exec(sql);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("duplicate column name") || msg.includes("already exists")) return;
      throw e;
    }
  }

  // --- migrations ---
  tryAlter(`ALTER TABLE proofs ADD COLUMN status TEXT NOT NULL DEFAULT 'issued'`);

  tryAlter(`ALTER TABLE proofs ADD COLUMN evidencePath TEXT`);
  tryAlter(`ALTER TABLE proofs ADD COLUMN evidenceUploadedAt TEXT`);
  tryAlter(`ALTER TABLE proofs ADD COLUMN evidenceMime TEXT`);

  tryAlter(`ALTER TABLE proofs ADD COLUMN verifiedAt TEXT`);
  tryAlter(`ALTER TABLE proofs ADD COLUMN rejectedAt TEXT`);
  tryAlter(`ALTER TABLE proofs ADD COLUMN rejectionType TEXT`);
  tryAlter(`ALTER TABLE proofs ADD COLUMN rejectionReason TEXT`);

  tryAlter(`ALTER TABLE proofs ADD COLUMN issuerType TEXT`);
  tryAlter(`ALTER TABLE proofs ADD COLUMN issuerId TEXT`);
  tryAlter(`ALTER TABLE proofs ADD COLUMN merchantId TEXT`);

  // Optional audit table (if your project uses it)
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      publicId TEXT,
      actorType TEXT,
      actorId TEXT,
      meta TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  _db = db;
  return db;
}

// Export a db "facade" so your code can keep using db.prepare/db.exec normally,
// but SQLite won't open until first actual request.
export const db = {
  prepare: (...args: Parameters<Database.Database["prepare"]>) => initDb().prepare(...args),
  exec: (...args: Parameters<Database.Database["exec"]>) => initDb().exec(...args),
  pragma: (...args: Parameters<Database.Database["pragma"]>) => initDb().pragma(...args),
} as Pick<Database.Database, "prepare" | "exec" | "pragma">;