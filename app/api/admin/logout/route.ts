import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/app/lib/adminSession";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("admin_session")?.value;

  if (sessionId) deleteSession(sessionId);

  cookieStore.set("admin_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ success: true });
}
