import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { cookies } from "next/headers";
import { hasSession } from "@/app/lib/adminSession";

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

  // ✅ SAFE SELECT (no issuerType dependency)
  const proof = db
    .prepare(
      `SELECT publicId, merchant, item, createdAt, proofHash, status,
              evidencePath, evidenceMime,
              verifiedAt, rejectedAt, rejectionReason
       FROM proofs
       WHERE publicId = ?`
    )
    .get(id) as any;

  if (!proof) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: proof.publicId,
    merchant: proof.merchant,
    item: proof.item,
    createdAt: proof.createdAt,
    proofHash: proof.proofHash,
    status: proof.status,

    hasEvidence: !!proof.evidencePath,
    evidenceMime: proof.evidenceMime ?? null,

    verifiedAt: proof.verifiedAt ?? null,
    rejectedAt: proof.rejectedAt ?? null,
    rejectionReason: proof.rejectionReason ?? null,

    // backward-compatible defaults
    issuerType: "user",
    issuerId: null,
  });
}
