import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { hasSession } from "@/app/lib/adminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // ✅ prevents static build trying to pre-render

const ADMIN_COOKIE_NAME = "adminSession";

function getAdminSessionId(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`)
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function GET(req: NextRequest) {
  const sessionId = getAdminSessionId(req);
  if (!hasSession(sessionId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // If your audit table name is different, change it here
  // Example assumes a table named "audit"
  const rows = db
    .prepare(
      `SELECT *
       FROM audit
       ORDER BY createdAt DESC
       LIMIT 200`
    )
    .all();

  return NextResponse.json({ rows });
}