import { NextResponse } from "next/server";
import { deleteSession } from "@/app/lib/adminSession";

export async function POST(req: Request) {
  const sessionId = req.headers
    .get("cookie")
    ?.match(/admin_session=([^;]+)/)?.[1];

  if (sessionId) deleteSession(sessionId);

  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_session", "", { maxAge: 0, path: "/" });
  return res;
}
