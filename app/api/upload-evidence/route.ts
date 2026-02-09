import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "@/app/lib/db";

export const runtime = "nodejs";

function getUploadDir() {
  const dir = process.env.UPLOAD_DIR;
  if (!dir) throw new Error("UPLOAD_DIR is not set");
  return dir;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const id = String(form.get("id") ?? form.get("proofId") ?? "").trim();
    const file = form.get("file");

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    if (!file || !(file instanceof File))
      return NextResponse.json({ error: "Missing file" }, { status: 400 });

    const uploadDir = getUploadDir();
    fs.mkdirSync(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());

    const safeName = (file.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_");
    const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 10);

    const filename = `${id}-${hash}-${safeName}`;
    const absPath = path.join(uploadDir, filename);

    fs.writeFileSync(absPath, buffer);

    db.prepare(`
      UPDATE proofs
      SET status='pending',
          evidencePath=?,
          evidenceUploadedAt=COALESCE(evidenceUploadedAt, ?)
      WHERE publicId=?
    `).run(filename, new Date().toISOString(), id);

    return NextResponse.redirect(new URL(`/p/${id}`, req.url), 303);
  } catch (err: any) {
    console.error("upload-evidence error:", err);
    return NextResponse.json(
      { error: "Upload failed", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}