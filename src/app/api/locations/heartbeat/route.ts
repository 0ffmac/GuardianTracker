import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;

  let data;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { latitude, longitude, accuracy, altitude, speed, timestamp, deviceId, trackingSessionId } = data;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !isFinite(latitude) ||
    !isFinite(longitude)
  ) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const location = await prisma.location.create({
      data: {
        userId,
        latitude,
        longitude,
        accuracy: typeof accuracy === "number" ? accuracy : undefined,
        altitude: typeof altitude === "number" ? altitude : undefined,
        speed: typeof speed === "number" ? speed : undefined,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        deviceId: typeof deviceId === "string" ? deviceId : undefined,
        trackingSessionId: typeof trackingSessionId === "string" ? trackingSessionId : undefined,
      },
    });
    return NextResponse.json({ success: true, location });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save location" }, { status: 500 });
  }
}
