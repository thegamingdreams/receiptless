import { NextResponse } from "next/server";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { db } from "@/app/lib/db";
import { logAudit } from "@/app/lib/audit";

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const merchant = String(body.merchant ?? "").trim();
  const reference = String(body.reference ?? "").trim();
  const item = String(body.item ?? "").trim();

  if (!merchant || !reference) {
    return NextResponse.json(
      { error: "merchant and reference are required" },
      { status: 400 }
    );
  }

  const referenceHash = hash(reference);
  const publicId = nanoid(6);
  const createdAt = new Date().toISOString();
  const proofHash = hash(merchant + referenceHash + createdAt);

  db.prepare(
    `INSERT INTO proofs (publicId, merchant, item, createdAt, proofHash, status)
     VALUES (?, ?, ?, ?, ?, 'issued')`
  ).run(publicId, merchant, item || null, createdAt, proofHash);

  logAudit(publicId, "proof_created", { issuer: "user" });

  return NextResponse.json({ publicId });
}
