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
  const merchantId = String(body.merchantId ?? "").trim();

  if (!merchantId) {
    return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
  }

  const rows = db.prepare(
    `SELECT id, label, createdAt, revokedAt
     FROM merchant_api_keys
     WHERE merchantId = ?
     ORDER BY createdAt DESC`
  ).all(merchantId) as any[];

  return NextResponse.json({
    keys: rows.map((k) => ({
      id: k.id,
      label: k.label ?? null,
      createdAt: k.createdAt,
      revokedAt: k.revokedAt ?? null,
      active: !k.revokedAt,
    })),
  });
}
