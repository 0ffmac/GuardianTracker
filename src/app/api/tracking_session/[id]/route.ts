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

  try {
    const updated = await prisma.trackingSession.update({
      where: { id: trackingSessionId },
      data: updateData,
    });

    return NextResponse.json({ trackingSession: updated });
  } catch (err: any) {
    const message = typeof err?.message === "string" ? err.message : "Failed to update tracking session";

    // If this deployment doesnt yet have the `quality` column,
    // Prisma will throw an "Unknown argument `quality`" ValidationError.
    // In that case, retry without `quality` so the rest of the update succeeds.
    if (message.includes("Unknown argument `quality`")) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { quality, ...rest } = updateData;
      if (Object.keys(rest).length === 0) {
        return NextResponse.json({ error: "Tracking session quality is not supported on this deployment yet." }, { status: 400 });
      }

      try {
        const updatedWithoutQuality = await prisma.trackingSession.update({
          where: { id: trackingSessionId },
          data: rest,
        });
        return NextResponse.json({
          trackingSession: updatedWithoutQuality,
          warning: "quality field is not available on this deployment; updated other fields only.",
        });
      } catch (innerErr: any) {
        const innerMessage =
          typeof innerErr?.message === "string" ? innerErr.message : "Failed to update tracking session";
        return NextResponse.json({ error: innerMessage }, { status: 500 });
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
