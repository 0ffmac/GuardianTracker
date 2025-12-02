import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const runtime = "nodejs";

const PLACE_CELL_DECIMALS = 3;
const NEARBY_RECENT_MINUTES = 60; // how far back we consider "nearby"

const computePlaceKey = (latitude: number, longitude: number) => {
  const factor = Math.pow(10, PLACE_CELL_DECIMALS);
  const latCell = Math.round(latitude * factor) / factor;
  const lonCell = Math.round(longitude * factor) / factor;
  return `${latCell.toFixed(PLACE_CELL_DECIMALS)},${lonCell.toFixed(
    PLACE_CELL_DECIMALS
  )}`;
};

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

  const latParam = searchParams.get("lat");
  const lonParam = searchParams.get("lon") || searchParams.get("lng");

  let latitude: number | null = latParam ? Number(latParam) : null;
  let longitude: number | null = lonParam ? Number(lonParam) : null;

  if (
    (latitude === null || Number.isNaN(latitude)) ||
    (longitude === null || Number.isNaN(longitude))
  ) {
    // Fallback: use last known location for this user/device
    const lastLocation = await prisma.location.findFirst({
      where: {
        userId,
        deviceId: targetDeviceId,
      },
      orderBy: { timestamp: "desc" },
    });

    if (!lastLocation) {
      return NextResponse.json(
        { error: "No location available to determine nearby devices" },
        { status: 400 }
      );
    }

    latitude = lastLocation.latitude;
    longitude = lastLocation.longitude;
  }

  const placeKey = computePlaceKey(latitude!, longitude!);
  const recentCutoff = new Date(
    Date.now() - NEARBY_RECENT_MINUTES * 60 * 1000
  );

  try {
    const devicePlaces = await (prisma as any).devicePlace.findMany({
      where: {
        placeKey,
        lastSeenAt: { gte: recentCutoff },
        trackedDevice: {
          userDeviceId: targetDeviceId,
          isSuspicious: true,
        },
      },
      include: {
        trackedDevice: true,
      },
    });

    const result = devicePlaces.map((p: any) => ({
      type: p.trackedDevice.type,
      identifier: p.trackedDevice.identifier,
      name: p.trackedDevice.lastName,
      first_seen_at: p.trackedDevice.firstSeenAt,
      last_seen_at: p.trackedDevice.lastSeenAt,
      total_sightings: p.trackedDevice.totalSightings,
      distinct_location_count: p.trackedDevice.distinctLocationCount,
      suspicion_score: p.trackedDevice.suspicionScore,
      last_seen_here_at: p.lastSeenAt,
      place_key: p.placeKey,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/tracked_devices/nearby] Internal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
