import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;
    const filePath = path.join(process.cwd(), "public", "audio", filename);

    const file = await fs.readFile(filePath);

    let contentType = "audio/webm";
    if (filename.endsWith(".mp3")) {
      contentType = "audio/mpeg";
    } else if (filename.endsWith(".wav")) {
      contentType = "audio/wav";
    }

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return new NextResponse("Audio file not found", { status: 404 });
    }

    console.error("Error serving audio file:", error);
    return new NextResponse("Error serving audio file", { status: 500 });
  }
}
