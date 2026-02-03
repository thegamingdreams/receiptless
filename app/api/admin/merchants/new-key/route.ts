import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { cookies } from "next/headers";
import { hasSession } from "@/app/lib/adminSession";
import { nanoid } from "nanoid";
import { generateApiKey, hashApiKey } from "@/app/lib/merchantAuth";

export async function POST(req: Request) {
  const sessionId = (await cookies()).get("admin_session")?.value;
  if (!hasSession(sessionId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const merchantId = String(body.merchantId ?? "").trim();
  const label = String(body.label ?? "").trim();

  if (!merchantId) {
    return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
  }

  const merchant = db.prepare(`SELECT id FROM merchants WHERE id = ?`).get(merchantId);
  if (!merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });

  const apiKey = generateApiKey();
  const keyHash = hashApiKey(apiKey);

  const id = nanoid(12);
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO merchant_api_keys (id, merchantId, keyHash, createdAt, revokedAt, label)
     VALUES (?, ?, ?, ?, NULL, ?)`
  ).run(id, merchantId, keyHash, createdAt, label || null);

  // Return the RAW key once (store it somewhere; cannot be recovered later)
  return NextResponse.json({ apiKey, keyId: id, createdAt });
}
