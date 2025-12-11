import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const sessionIdsParam = url.searchParams.get("sessionIds"); // optional, comma-separated

  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  try {
    const whereTime: { gte?: Date; lte?: Date } = {};
    if (from) whereTime.gte = new Date(from);
    if (to) whereTime.lte = new Date(to);

    const sessionIds =
      sessionIdsParam && sessionIdsParam.trim().length > 0
        ? sessionIdsParam.split(",")
        : null;

    // 1) Fetch locations for this user (to get "you" positions)
    const locations = await prisma.location.findMany({
      where: {
        userId,
        ...(Object.keys(whereTime).length ? { timestamp: whereTime } : {}),
        ...(sessionIds ? { trackingSessionId: { in: sessionIds } } : {}),
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        timestamp: true,
        trackingSessionId: true,
      },
      orderBy: { timestamp: "asc" },
    });

    // Group locations by trackingSessionId for quick lookups
    const locBySession = new Map<
      string | null,
      { lat: number; lon: number; ts: number }[]
    >();
    for (const loc of locations) {
      const key = loc.trackingSessionId || null;
      if (!locBySession.has(key)) locBySession.set(key, []);
      locBySession.get(key)!.push({
        lat: loc.latitude,
        lon: loc.longitude,
        ts: loc.timestamp.getTime(),
      });
    }

    // 2) Fetch device observations (device positions)
    const deviceObservations = await prisma.deviceObservation.findMany({
      where: {
        userDevice: { userId },
        ...(Object.keys(whereTime).length ? { timestamp: whereTime } : {}),
        ...(sessionIds ? { trackingSessionId: { in: sessionIds } } : {}),
      },
      select: {
        type: true,
        identifier: true,
        latitude: true,
        longitude: true,
        timestamp: true,
        trackingSessionId: true,
      },
      orderBy: { timestamp: "asc" },
    });

    type Agg = {
      type: string;
      identifier: string;
      count: number;
      sumMeters: number;
      minMeters: number;
      maxMeters: number;
    };

    const agg = new Map<string, Agg>();

    function findNearestLocation(
      trackingSessionId: string | null,
      obsTime: number
    ): { lat: number; lon: number } | null {
      const arr = locBySession.get(trackingSessionId || null);
      if (!arr || arr.length === 0) return null;
      let best = arr[0];
      let bestDiff = Math.abs(arr[0].ts - obsTime);
      for (let i = 1; i < arr.length; i++) {
        const diff = Math.abs(arr[i].ts - obsTime);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = arr[i];
        }
      }
      return { lat: best.lat, lon: best.lon };
    }

    for (const obs of deviceObservations) {
      const userPos = findNearestLocation(
        obs.trackingSessionId,
        obs.timestamp.getTime()
      );
      if (!userPos) continue;

      const meters = haversineMeters(
        userPos.lat,
        userPos.lon,
        obs.latitude,
        obs.longitude
      );

      // Normalize type and build a stable distance key
      const obsType =
        obs.type.toLowerCase() === "wifi"
          ? "wifi"
          : obs.type.toLowerCase() === "ble"
          ? "ble"
          : obs.type.toLowerCase();

      const distanceKey = `${obsType}:${obs.identifier}`;

      const current = agg.get(distanceKey) || {
        type: obsType,
        identifier: obs.identifier,
        count: 0,
        sumMeters: 0,
        minMeters: Number.POSITIVE_INFINITY,
        maxMeters: 0,
      };

      current.count += 1;
      current.sumMeters += meters;
      if (meters < current.minMeters) current.minMeters = meters;
      if (meters > current.maxMeters) current.maxMeters = meters;

      agg.set(distanceKey, current);
    }

    const devices = Array.from(agg.entries()).map(([distanceKey, a]) => ({
      distanceKey,
      type: a.type,
      identifier: a.identifier,
      count: a.count,
      minMeters:
        a.minMeters === Number.POSITIVE_INFINITY ? null : a.minMeters,
      maxMeters: a.maxMeters || null,
      avgMeters: a.count > 0 ? a.sumMeters / a.count : null,
    }));

    return NextResponse.json({ devices });
  } catch (err) {
    console.error("[/api/analytics/device_distances] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
