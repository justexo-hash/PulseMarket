import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: { path: string[] } }
) {
  const segments = Array.isArray(params.path) ? params.path : [params.path];
  const filePath = path.join(UPLOADS_DIR, ...segments);
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(path.normalize(UPLOADS_DIR))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const data = await fs.readFile(normalized);
    const ext = path.extname(normalized).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[Uploads] Failed to read file:", error);
    return NextResponse.json(
      { error: "Failed to load file" },
      { status: 500 }
    );
  }
}


