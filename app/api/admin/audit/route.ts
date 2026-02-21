import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { hasSession } from "@/app/lib/adminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  // IMPORTANT: DB query must be inside the handler (not at module scope)
  try {
    const rows = db
      .prepare(
        `SELECT id, action, publicId, actorType, actorId, meta, createdAt
         FROM audit
         ORDER BY id DESC
         LIMIT 100`
      )
      .all();

    return NextResponse.json({ rows });
  } catch (e: any) {
    // If audit table somehow missing, don't crash build/runtime
    return NextResponse.json(
      { rows: [], warning: String(e?.message || e) },
      { status: 200 }
    );
  }
}