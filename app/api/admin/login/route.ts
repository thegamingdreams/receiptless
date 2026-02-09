import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession } from "@/app/lib/adminSession";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "").trim();

  const expectedUser = process.env.ADMIN_USERNAME || "admin";
  const expectedPass = process.env.ADMIN_PASSWORD || "";

  // In production, force ADMIN_PASSWORD to be set
  if (process.env.NODE_ENV === "production" && !expectedPass) {
    return NextResponse.json(
      { error: "Server misconfigured: ADMIN_PASSWORD is not set" },
      { status: 500 }
    );
  }

  if (username !== expectedUser || password !== expectedPass) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const sessionId = createSession();

  (await cookies()).set("admin_session", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return NextResponse.json({ success: true });
}
