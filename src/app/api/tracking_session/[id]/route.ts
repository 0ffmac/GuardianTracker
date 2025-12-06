import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const trackingSessionId = params.id;
  if (!trackingSessionId) {
    return NextResponse.json({ error: "Tracking session id is required" }, { status: 400 });
  }
  // Ensure the tracking session belongs to the user
  const trackingSession = await prisma.trackingSession.findFirst({ where: { id: trackingSessionId, userId } });
  if (!trackingSession) {
    return NextResponse.json({ error: "Tracking session not found" }, { status: 404 });
  }
  // Delete only the session itself; keep locations and their Wi-Fi/BLE scans
  await prisma.trackingSession.delete({ where: { id: trackingSessionId } });
  return NextResponse.json({ success: true });
}
