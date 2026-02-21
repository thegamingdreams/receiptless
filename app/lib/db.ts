import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

// Detect build reliably inside Docker (`npm run build`)
const isBuild = process.env.npm_lifecycle_event === "build";

// Use local db during build so Next can import route modules safely
const runtimeDbPath =
  process.env.DB_PATH || path.join(process.cwd(), "receiptless.db");

const buildDbPath = path.join(process.cwd(), "receiptless.build.db");

const dbPath = isBuild ? buildDbPath : runtimeDbPath;

let _db: Database.Database | null = null;

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (dir && dir !== "." && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function tryAlter(db: Database.Database, sql: string) {
  try {
    db.exec(sql);
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes("duplicate column name") || msg.includes("already exists"))
      return;
    throw e;
  }
}

function initDb() {
  if (_db) return _db;

  ensureDir(dbPath);

  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // proofs
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

  // migrations
  tryAlter(db, `ALTER TABLE proofs ADD COLUMN status TEXT NOT NULL DEFAULT 'issued'`);
  tryAlter(db, `ALTER TABLE proofs ADD COLUMN evidencePath TEXT`);
  tryAlter(db, `ALTER TABLE proofs ADD COLUMN evidenceUploadedAt TEXT`);
  tryAlter(db, `ALTER TABLE proofs ADD COLUMN evidenceMime TEXT`);
  tryAlter(db, `ALTER TABLE proofs ADD COLUMN verifiedAt TEXT`);
  tryAlter(db, `ALTER TABLE proofs ADD COLUMN rejectedAt TEXT`);
  tryAlter(db, `ALTER TABLE proofs ADD COLUMN rejectionReason TEXT`);
  tryAlter(db, `ALTER TABLE proofs ADD COLUMN issuerType TEXT`);
  tryAlter(db, `ALTER TABLE proofs ADD COLUMN issuerId TEXT`);
  tryAlter(db, `ALTER TABLE proofs ADD COLUMN merchantId TEXT`);

  // audit table (if used)
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

// Keep your existing code the same: db.prepare(...).get(...), etc.
export const db = {
  prepare: (...args: Parameters<Database.Database["prepare"]>) =>
    initDb().prepare(...args),
  exec: (...args: Parameters<Database.Database["exec"]>) => initDb().exec(...args),
  pragma: (...args: Parameters<Database.Database["pragma"]>) =>
    initDb().pragma(...args),
} as Pick<Database.Database, "prepare" | "exec" | "pragma">;