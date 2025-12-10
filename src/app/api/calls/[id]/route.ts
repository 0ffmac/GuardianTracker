import { NextResponse } from "next/server";

export const runtime = "nodejs";

const RETIRED_MESSAGE = "Audio calling has been retired from the mobile app.";

export async function GET(
  _request: Request,
  _context: { params: { id: string } }
) {
  return NextResponse.json(
    { success: false, error: RETIRED_MESSAGE },
    { status: 410 }
  );
}
