import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { requireAdmin } from "@/app/lib/adminSession";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  // must be logged in as admin
  requireAdmin();

  const row = db
    .prepare("SELECT evidencePath FROM proofs WHERE publicId = ?")
    .get(params.id) as { evidencePath?: string } | undefined;

  if (!row?.evidencePath) {
    return new NextResponse("No evidence", { status: 404 });
  }

  const uploadDir = process.env.UPLOAD_DIR;
  if (!uploadDir) return new NextResponse("UPLOAD_DIR not set", { status: 500 });

  const filePath = path.join(uploadDir, row.evidencePath);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Evidence file missing", { status: 404 });
  }

  const file = fs.readFileSync(filePath);

  // basic content-type detection
  const ext = path.extname(row.evidencePath).toLowerCase();
  const contentType =
    ext === ".png" ? "image/png" :
    ext === ".webp" ? "image/webp" :
    ext === ".pdf" ? "application/pdf" :
    "image/jpeg";

  return new NextResponse(file, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}