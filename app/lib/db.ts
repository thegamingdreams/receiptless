import fs from "fs";
import path from "path";

// We keep the actual sqlite instance private and initialize only when needed.
let _db: any | null = null;

function isNextBuildPhase() {
  // Next sets this during `next build`
  return process.env.NEXT_PHASE === "phase-production-build";
}

function initDb() {
  if (_db) return _db;

  // IMPORTANT:
  // During Next build on Render/Docker, touching real disk paths can crash.
  // So in build phase we use in-memory sqlite.
  const dbPath = isNextBuildPhase()
    ? ":memory:"
    : process.env.DB_PATH || path.join(process.cwd(), "receiptless.db");

  // Ensure DB directory exists if DB_PATH is a real file path
  if (dbPath !== ":memory:") {
    const dir = path.dirname(dbPath);
    if (dir && dir !== "." && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Dynamic require keeps turbopack happier and avoids weird build-time behavior.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Database = require("better-sqlite3") as typeof import("better-sqlite3");

  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Base table
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

  // Safe ALTER helper
  function tryAlter(sql: string) {
    try {
      db.exec(sql);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("duplicate column name") || msg.includes("already exists")) {
        return;
      }
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
  tryAlter(`ALTER TABLE proofs ADD COLUMN rejectionReason TEXT`);

  tryAlter(`ALTER TABLE proofs ADD COLUMN issuerType TEXT`);
  tryAlter(`ALTER TABLE proofs ADD COLUMN issuerId TEXT`);
  tryAlter(`ALTER TABLE proofs ADD COLUMN merchantId TEXT`);

  _db = db;
  return db;
}

/**
 * Proxy export so your existing code can keep doing:
 *   import { db } from "@/app/lib/db";
 *   db.prepare(...).get(...)
 *
 * without changing all imports.
 */
export const db: any = new Proxy(
  {},
  {
    get(_target, prop) {
      const real = initDb();
      const value = real[prop as any];
      return typeof value === "function" ? value.bind(real) : value;
    },
  }
);