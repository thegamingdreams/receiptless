import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { cookies } from "next/headers";
import { hasSession } from "@/app/lib/adminSession";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  const sessionId = (await cookies()).get("admin_session")?.value;
  if (!hasSession(sessionId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const id = nanoid(10);
  const createdAt = new Date().toISOString();

  db.prepare(`INSERT INTO merchants (id, name, createdAt) VALUES (?, ?, ?)`)
    .run(id, name, createdAt);

  return NextResponse.json({ id, name, createdAt });
}
