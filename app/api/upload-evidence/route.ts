import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { logAudit } from "@/app/lib/audit";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export async function POST(req: Request) {
  const form = await req.formData();
  const id = String(form.get("id") ?? "").trim();
  const file = form.get("file") as File | null;

  if (!id || !file) {
    return NextResponse.json({ error: "Missing id or file" }, { status: 400 });
  }

  // Ensure proof exists
  const proof = db.prepare(`SELECT status FROM proofs WHERE publicId = ?`).get(id) as any;
  if (!proof) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Save file under /uploads
 const uploadsDir = process.env.UPLOAD_DIR
  ? process.env.UPLOAD_DIR
  : path.join(process.cwd(), "uploads");


  const ext = guessExt(file.type);
  const name = `${id}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const savePath = path.join(uploadsDir, name);

  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(savePath, buf);

  const mimeType = file.type || "application/octet-stream";

  // Mark pending review
  db.prepare(
    `UPDATE proofs
     SET evidencePath = ?, evidenceMime = ?, status = 'pending'
     WHERE publicId = ?`
  ).run(savePath, mimeType, id);

  logAudit(id, "evidence_uploaded", { mime: mimeType });

  // Redirect back to proof page
  return NextResponse.redirect(new URL(`/p/${id}`, req.url), 303);
}

function guessExt(mime: string) {
  if (mime === "application/pdf") return ".pdf";
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  return "";
}
