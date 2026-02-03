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
  const keyId = String(body.keyId ?? "").trim();

  if (!keyId) {
    return NextResponse.json({ error: "keyId is required" }, { status: 400 });
  }

  const existing = db.prepare(
    `SELECT id, revokedAt FROM merchant_api_keys WHERE id = ?`
  ).get(keyId) as any;

  if (!existing) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  if (existing.revokedAt) {
    return NextResponse.json({ success: true, alreadyRevoked: true });
  }

  const now = new Date().toISOString();

  db.prepare(
    `UPDATE merchant_api_keys SET revokedAt = ? WHERE id = ?`
  ).run(now, keyId);

  return NextResponse.json({ success: true, revokedAt: now });
}
