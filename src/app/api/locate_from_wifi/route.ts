import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const runtime = "nodejs";

interface WifiScanInput {
  bssid: string;
  rssi: number;
  ssid?: string | null;
}

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authHeader =
    request.headers.get("authorization") ||
    request.headers.get("Authorization");

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
          userId: string;
          deviceId?: string;
        };
        return decoded.userId;
      } catch (e) {
        console.error("[/api/locate_from_wifi] Invalid mobile token:", e);
      }
    }
  }

  const session = await getServerSession(authOptions);
  if (session && (session.user as any)?.id) {
    return (session.user as any).id as string;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    let wifiRaw: any;
    if (Array.isArray(body)) {
      wifiRaw = body;
    } else if (body && Array.isArray(body.wifi)) {
      wifiRaw = body.wifi;
    } else {
      return NextResponse.json(
        { error: "Expected an array or { wifi: [...] }" },
        { status: 400 }
      );
    }

    const wifi: WifiScanInput[] = (wifiRaw as any[])
      .filter((item) => item && typeof item.bssid === "string")
      .map((item) => ({
        bssid: String(item.bssid),
        rssi: Number(item.rssi ?? 0),
        ssid:
          item.ssid !== undefined && item.ssid !== null
            ? String(item.ssid)
            : null,
      }));

    if (!wifi.length) {
      return NextResponse.json(
        { error: "No valid Wi-Fi observations provided" },
        { status: 400 }
      );
    }

    const bssids = Array.from(new Set(wifi.map((w) => w.bssid)));

    const historicalScans = await prisma.wifiScan.findMany({
      where: {
        bssid: { in: bssids },
        location: { userId },
      },
      select: {
        bssid: true,
        rssi: true,
        location: {
          select: {
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    if (!historicalScans.length) {
      return NextResponse.json(
        { error: "No historical data for these BSSIDs" },
        { status: 404 }
      );
    }

    const apStats = new Map<
      string,
      { latSum: number; lonSum: number; count: number }
    >();

    for (const scan of historicalScans) {
      const { latitude, longitude } = scan.location;
      if (latitude == null || longitude == null) continue;
      const key = scan.bssid;
      const existing = apStats.get(key);
      if (!existing) {
        apStats.set(key, {
          latSum: latitude,
          lonSum: longitude,
          count: 1,
        });
      } else {
        existing.latSum += latitude;
        existing.lonSum += longitude;
        existing.count += 1;
      }
    }

    const apByBssid = new Map<
      string,
      { lat: number; lon: number; samples: number }
    >();
    for (const [bssid, stats] of apStats.entries()) {
      if (stats.count <= 0) continue;
      apByBssid.set(bssid, {
        lat: stats.latSum / stats.count,
        lon: stats.lonSum / stats.count,
        samples: stats.count,
      });
    }

    let weightedLatSum = 0;
    let weightedLonSum = 0;
    let weightSum = 0;

    const usedAccessPoints: Array<{
      bssid: string;
      ssid: string | null;
      rssi: number;
      apLatitude: number;
      apLongitude: number;
      weight: number;
      samples: number;
    }> = [];

    for (const obs of wifi) {
      const ap = apByBssid.get(obs.bssid);
      if (!ap) continue;
      const rssi = Number.isFinite(obs.rssi) ? obs.rssi : 0;
      const weight = Math.max(1e-6, Math.pow(10, rssi / 20));

      weightedLatSum += ap.lat * weight;
      weightedLonSum += ap.lon * weight;
      weightSum += weight;

      usedAccessPoints.push({
        bssid: obs.bssid,
        ssid: obs.ssid ?? null,
        rssi,
        apLatitude: ap.lat,
        apLongitude: ap.lon,
        weight,
        samples: ap.samples,
      });
    }

    if (!weightSum || !usedAccessPoints.length) {
      return NextResponse.json(
        { error: "No overlap between scan and known access points" },
        { status: 404 }
      );
    }

    const latitude = weightedLatSum / weightSum;
    const longitude = weightedLonSum / weightSum;

    let accuracyMeters = 80;
    if (usedAccessPoints.length >= 4) {
      accuracyMeters = 30;
    } else if (usedAccessPoints.length === 3) {
      accuracyMeters = 40;
    } else if (usedAccessPoints.length === 2) {
      accuracyMeters = 60;
    } else {
      accuracyMeters = 100;
    }

    return NextResponse.json({
      latitude,
      longitude,
      accuracyMeters,
      accessPointsUsed: usedAccessPoints,
    });
  } catch (error) {
    console.error("[/api/locate_from_wifi] Internal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
