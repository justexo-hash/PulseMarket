import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";
import { requireAdmin } from "../../_utils/auth";

export const runtime = "nodejs";

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

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

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

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const ext = getExtension(file);
    const baseName = path
      .basename(file.name || "upload", ext)
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]/g, "")
      .toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;
    const filename = `${baseName || "upload"}-${uniqueSuffix}${ext}`;

    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/${filename}`,
      filename,
    });
  } catch (error: any) {
    console.error("[Upload] Error:", error);
    const rawMessage = error?.message || "Failed to upload image";
    let status = 500;
    if (rawMessage === "Not authenticated" || rawMessage === "User not found") {
      status = 401;
    } else if (rawMessage === "Admin access required") {
      status = 403;
    }

    return NextResponse.json({ error: rawMessage }, { status });
  }
}

