import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") ?? "").trim();

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const row = db.prepare(
    `SELECT publicId, merchant, item, createdAt, proofHash, status,
            verifiedAt, rejectedAt, rejectionReason,
            issuerType, issuerId
     FROM proofs
     WHERE publicId = ?`
  ).get(id) as any;

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: row.publicId,
    merchant: row.merchant,
    item: row.item ?? "",
    createdAt: row.createdAt,
    proofHash: row.proofHash,
    status: row.status ?? "issued",
    verifiedAt: row.verifiedAt ?? null,
    rejectedAt: row.rejectedAt ?? null,
    rejectionReason: row.rejectionReason ?? null,
    issuerType: row.issuerType ?? "user",
    issuerId: row.issuerId ?? null,
  });
}
