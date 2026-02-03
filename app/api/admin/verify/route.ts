import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { cookies } from "next/headers";
import { hasSession } from "@/app/lib/adminSession";
import { logAudit } from "@/app/lib/audit";

export async function POST(req: Request) {
  const sessionId = (await cookies()).get("admin_session")?.value;
  if (!hasSession(sessionId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const existing = db.prepare(`SELECT status FROM proofs WHERE publicId = ?`).get(id) as any;
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot verify from status '${existing.status}'` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  db.prepare(
    `UPDATE proofs
     SET status = 'verified',
         verifiedAt = ?,
         rejectedAt = NULL,
         rejectionReason = NULL
     WHERE publicId = ?`
  ).run(now, id);

  logAudit(id, "admin_verified");

  return NextResponse.json({ success: true, id, status: "verified", verifiedAt: now });
}
