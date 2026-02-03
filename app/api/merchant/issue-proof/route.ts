import { NextResponse } from "next/server";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { db } from "@/app/lib/db";
import { logAudit } from "@/app/lib/audit";
import { getMerchantByApiKey } from "@/app/lib/merchantAuth";

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key") || "";
  const merchant = getMerchantByApiKey(apiKey);

  if (!merchant) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const reference = String(body.reference ?? "").trim();
  const item = String(body.item ?? "").trim();

  if (!reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }

  const referenceHash = hash(reference);
  const publicId = nanoid(6);
  const createdAt = new Date().toISOString();

  // merchant-issued proofs are auto-verified
  const status = "verified";
  const verifiedAt = createdAt;
  const proofHash = hash(merchant.merchantName + referenceHash + createdAt);

  db.prepare(
    `INSERT INTO proofs (
      publicId, merchant, item, createdAt, proofHash,
      status, verifiedAt,
      issuerType, issuerId, merchantId
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    publicId,
    merchant.merchantName,
    item || null,
    createdAt,
    proofHash,
    status,
    verifiedAt,
    "merchant",
    merchant.merchantId,
    merchant.merchantId
  );

  logAudit(publicId, "proof_created", { issuer: "merchant", merchantId: merchant.merchantId });
  logAudit(publicId, "auto_verified", { reason: "merchant_issued" });

  return NextResponse.json({
    publicId,
    status,
    verifiedAt,
  });
}
