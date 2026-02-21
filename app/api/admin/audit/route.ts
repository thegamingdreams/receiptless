import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { hasSession } from "@/app/lib/adminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ADMIN_COOKIE_NAME = "adminSession";

export async function GET(req: NextRequest) {
  // auth
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`)
  );
  const sessionId = match?.[1] ? decodeURIComponent(match[1]) : null;

  if (!hasSession(sessionId)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // If you have an audit table, return latest rows.
  // If you DON'T have it yet, return [] instead of crashing build/runtime.
  try {
    const rows = db
      .prepare(
        `SELECT * FROM audit
         ORDER BY createdAt DESC
         LIMIT 200`
      )
      .all();

    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json({ rows: [] });
  }
}