import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { cookies } from "next/headers";
import { hasSession } from "@/app/lib/adminSession";

export async function POST() {
  const sessionId = (await cookies()).get("admin_session")?.value;
  if (!hasSession(sessionId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const merchants = db.prepare(
    `SELECT id, name, createdAt
     FROM merchants
     ORDER BY createdAt DESC`
  ).all();

  return NextResponse.json({ merchants });
}
