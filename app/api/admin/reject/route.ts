import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { cookies } from "next/headers";
import { hasSession } from "@/app/lib/adminSession";

export async function POST(req: Request) {
  // ✅ session check
  const sessionId = (await cookies()).get("admin_session")?.value;
  if (!hasSession(sessionId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  const reason = String(body.reason ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  if (!reason) {
    return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
  }

  const existing = db
    .prepare(`SELECT status FROM proofs WHERE publicId = ?`)
    .get(id) as any;

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only allow reject when pending (optional but recommended)
  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot reject from status '${existing.status}'` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  db.prepare(
    `UPDATE proofs
     SET status = 'rejected',
         rejectedAt = ?,
         rejectionReason = ?,
         verifiedAt = NULL
     WHERE publicId = ?`
  ).run(now, reason, id);

  return NextResponse.json({
    success: true,
    id,
    status: "rejected",
    rejectedAt: now,
    rejectionReason: reason,
  });
}
