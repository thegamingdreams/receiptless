import { db } from "@/app/lib/db";

export function logAudit(
  proofId: string,
  event: string,
  meta?: Record<string, any>
) {
  const at = new Date().toISOString();
  const metaStr = meta ? JSON.stringify(meta) : null;

  db.prepare(
    `INSERT INTO audit_logs (proofId, event, at, meta)
     VALUES (?, ?, ?, ?)`
  ).run(proofId, event, at, metaStr);
}
