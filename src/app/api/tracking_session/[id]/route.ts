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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const trackingSessionId = params.id;

  if (!trackingSessionId) {
    return NextResponse.json({ error: "Tracking session id is required" }, { status: 400 });
  }

  const existing = await prisma.trackingSession.findFirst({
    where: { id: trackingSessionId, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Tracking session not found" }, { status: 404 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const updateData: any = {};

  if ("name" in body) {
    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      updateData.name = trimmed.length > 0 ? trimmed : null;
    } else if (body.name === null) {
      updateData.name = null;
    }
  }

  if ("quality" in body) {
    const allowed = ["GOOD", "REGULAR", "BAD"] as const;
    const value = body.quality;
    if (value == null) {
      updateData.quality = "REGULAR";
    } else if (!allowed.includes(value)) {
      return NextResponse.json({ error: "Invalid quality value" }, { status: 400 });
    } else {
      updateData.quality = value;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await prisma.trackingSession.update({
    where: { id: trackingSessionId },
    data: updateData,
  });

  return NextResponse.json({ trackingSession: updated });
}
