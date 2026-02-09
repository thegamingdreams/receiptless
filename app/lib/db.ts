import Database from "better-sqlite3";
import path from "path";

const dbPath = process.env.DB_PATH
  ? process.env.DB_PATH
  : path.join(process.cwd(), "receiptless.db");

export const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS proofs (
    publicId TEXT PRIMARY KEY,
    merchant TEXT NOT NULL,
    item TEXT,
    createdAt TEXT NOT NULL,
    proofHash TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'issued',

    evidencePath TEXT,
    evidenceMime TEXT,

    verifiedAt TEXT,
    rejectedAt TEXT,
    rejectionReason TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proofId TEXT NOT NULL,
    event TEXT NOT NULL,
    at TEXT NOT NULL,
    meta TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS merchants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS merchant_api_keys (
    id TEXT PRIMARY KEY,
    merchantId TEXT NOT NULL,
    keyHash TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    revokedAt TEXT,
    label TEXT,
    FOREIGN KEY (merchantId) REFERENCES merchants(id)
  );
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_proofId ON audit_logs(proofId);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_logs(at);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_keys_merchantId ON merchant_api_keys(merchantId);`);

function tryAlter(sql: string) {
  try {
    db.exec(sql);
  } catch {}
}

// backwards-compatible migrations
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
