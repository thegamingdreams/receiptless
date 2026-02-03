import crypto from "crypto";
import { db } from "@/app/lib/db";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export function generateApiKey() {
  // readable-ish but strong enough for MVP
  const raw = crypto.randomBytes(24).toString("hex");
  return `rl_${raw}`;
}

export function hashApiKey(apiKey: string) {
  return sha256(apiKey);
}

export function getMerchantByApiKey(apiKey: string) {
  const keyHash = hashApiKey(apiKey);

  const row = db.prepare(
    `SELECT m.id as merchantId, m.name as merchantName, k.revokedAt as revokedAt
     FROM merchant_api_keys k
     JOIN merchants m ON m.id = k.merchantId
     WHERE k.keyHash = ?`
  ).get(keyHash) as any;

  if (!row) return null;
  if (row.revokedAt) return null;

  return { merchantId: row.merchantId, merchantName: row.merchantName };
}
