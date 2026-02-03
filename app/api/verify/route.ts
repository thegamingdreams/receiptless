import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  // Don't select issuerType (some older DBs won't have it)
  const proof = db
    .prepare(
      `SELECT status, verifiedAt, rejectedAt, rejectionReason
       FROM proofs WHERE publicId = ?`
    )
    .get(id) as any;

  if (!proof) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: proof.status === "verified",
    status: proof.status,
    verifiedAt: proof.verifiedAt ?? null,
    rejectedAt: proof.rejectedAt ?? null,
    rejectionReason: proof.rejectionReason ?? null,
  });
}
