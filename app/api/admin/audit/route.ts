import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { cookies } from "next/headers";
import { hasSession } from "@/app/lib/adminSession";

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return { raw: s };
  }
}

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

  const rows = db.prepare(
    `SELECT id, event, at, meta
     FROM audit_logs
     WHERE proofId = ?
     ORDER BY at ASC`
  ).all(id) as any[];

  return NextResponse.json({
    logs: rows.map((r) => ({
      id: r.id,
      event: r.event,
      at: r.at,
      meta: r.meta ? safeParse(r.meta) : null,
    })),
  });
}
