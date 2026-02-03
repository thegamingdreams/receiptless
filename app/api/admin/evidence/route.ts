import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { hasSession } from "@/app/lib/adminSession";

export async function POST(req: Request) {
  // ✅ session check
  const sessionId = (await cookies()).get("admin_session")?.value;
  if (!hasSession(sessionId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const row = db
    .prepare(`SELECT evidencePath, evidenceMime FROM proofs WHERE publicId = ?`)
    .get(id) as any;

  if (!row || !row.evidencePath) {
    return NextResponse.json({ error: "No evidence found" }, { status: 404 });
  }

  const filePath = path.isAbsolute(row.evidencePath)
    ? row.evidencePath
    : path.join(process.cwd(), row.evidencePath);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Evidence file missing" }, { status: 404 });
  }

  const buf = fs.readFileSync(filePath);
  const base64 = buf.toString("base64");

  return NextResponse.json({
    mime: row.evidenceMime || "application/octet-stream",
    base64,
  });
}
