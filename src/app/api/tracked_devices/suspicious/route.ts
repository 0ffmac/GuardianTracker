import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const runtime = "nodejs";

async function getAuthContext(request: Request): Promise<{
  userId: string | null;
  deviceId: string | null;
}> {
  let userId: string | null = null;
  let deviceId: string | null = null;

  const authorization =
    request.headers.get("authorization") ||
    request.headers.get("Authorization");
  const token = authorization?.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        deviceId: string;
      };
      userId = decoded.userId;
      deviceId = decoded.deviceId;
      return { userId, deviceId };
    } catch (e) {
      // fall through to session-based auth
    }
  }

  const session = await getServerSession(authOptions);
  if (session && session.user) {
    userId = (session.user as any).id as string;
    deviceId = ((session.user as any).deviceId as string) || null;
  }

  return { userId, deviceId };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { userId, deviceId } = await getAuthContext(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const explicitDeviceId = searchParams.get("user_device_id");
  const targetDeviceId = explicitDeviceId || deviceId;

  if (!targetDeviceId) {
    return NextResponse.json(
      { error: "user_device_id is required" },
      { status: 400 }
    );
  }

  const limitParam = searchParams.get("limit");
  const minScoreParam = searchParams.get("min_score");

  const limit = Math.min(Number(limitParam) || 50, 200);
  const minScore = Number(minScoreParam) || 0;

  try {
    const trackedDevices = await (prisma as any).trackedDevice.findMany({
      where: {
        userDeviceId: targetDeviceId,
        isSuspicious: true,
        suspicionScore: { gte: minScore },
      },
      orderBy: { suspicionScore: "desc" },
      take: limit,
    });

    const result = trackedDevices.map((d: any) => ({
      type: d.type,
      identifier: d.identifier,
      name: d.lastName,
      first_seen_at: d.firstSeenAt,
      last_seen_at: d.lastSeenAt,
      total_sightings: d.totalSightings,
      distinct_location_count: d.distinctLocationCount,
      suspicion_score: d.suspicionScore,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/tracked_devices/suspicious] Internal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
