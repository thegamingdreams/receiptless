import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { hasSession } from "@/app/lib/adminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_COOKIE_NAME = "adminSession";

function getSessionId(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`)
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function GET(req: NextRequest) {
  const sessionId = getSessionId(req);

  if (!hasSession(sessionId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = db
      .prepare("SELECT * FROM audit ORDER BY createdAt DESC LIMIT 200")
      .all();

    return NextResponse.json({ rows });
  } catch (err) {
    console.error("Audit query failed:", err);
    return NextResponse.json({ error: "Audit failed" }, { status: 500 });
  }
}