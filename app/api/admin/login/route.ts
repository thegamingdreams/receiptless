import { NextResponse } from "next/server";
import { createSession } from "@/app/lib/adminSession";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body;

  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const sessionId = createSession();

  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_session", sessionId, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
  });

  return res;
}
