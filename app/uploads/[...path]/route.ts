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
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const segments = Array.isArray(params.path) ? params.path : [params.path];
  const filePath = path.join(UPLOADS_DIR, ...segments);
  const normalized = path.normalize(filePath);
  
  // Log for debugging
  console.log(`[Uploads Route] Requested path: /uploads/${segments.join('/')}`);
  console.log(`[Uploads Route] File path: ${normalized}`);
  console.log(`[Uploads Route] UPLOADS_DIR: ${UPLOADS_DIR}`);
  
  if (!normalized.startsWith(path.normalize(UPLOADS_DIR))) {
    console.error(`[Uploads Route] Invalid path: ${normalized} not in ${UPLOADS_DIR}`);
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    // Check if file exists
    try {
      await fs.access(normalized);
    } catch (accessError) {
      console.error(`[Uploads Route] File not found: ${normalized}`);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    
    const data = await fs.readFile(normalized);
    const ext = path.extname(normalized).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    
    console.log(`[Uploads Route] Serving file: ${normalized} (${(data.length / 1024).toFixed(2)} KB)`);
    
    // NextResponse accepts Buffer directly
    return new NextResponse(data as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error(`[Uploads Route] Error reading file ${normalized}:`, error);
    if (error?.code === "ENOENT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to load file" },
      { status: 500 }
    );
  }
}


