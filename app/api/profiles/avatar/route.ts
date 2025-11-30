import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";
import { requireUser } from "../../_utils/auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function getExtension(file: File) {
  const originalExt = path.extname(file.name || "");
  if (originalExt) {
    return originalExt.toLowerCase();
  }
  switch (file.type) {
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    default:
      return "";
  }
}

const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
const PUBLIC_UPLOAD_PATH =
  process.env.UPLOADS_PUBLIC_PATH || "/uploads";

export async function POST(request: NextRequest) {
  try {
    await requireUser();

    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    const ext = getExtension(file) || ".png";
    const filename = `avatar-${Date.now()}-${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `${PUBLIC_UPLOAD_PATH}/${filename}`,
      filename,
    });
  } catch (error: any) {
    console.error("[Avatar Upload] Error:", error);
    const message = error?.message || "Failed to upload image";
    const status =
      message === "Not authenticated" || message === "User not found" ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}


