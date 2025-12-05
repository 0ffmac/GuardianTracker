import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const JWT_SECRET = process.env.NEXTAUTH_SECRET as string;

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authHeader =
    request.headers.get("authorization") ??
    request.headers.get("Authorization");

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice("bearer ".length).trim();
    if (token && JWT_SECRET) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as {
          userId?: string;
          sub?: string;
          id?: string;
        };
        const userId = payload.userId ?? payload.sub ?? payload.id;
        if (typeof userId === "string" && userId.length > 0) {
          return userId;
        }
      } catch (e) {
        console.error("[/api/tracking_session/[id]/environment] Invalid mobile token:", e);
      }
    }
  }

  const session = await getServerSession(authOptions);
  if (session?.user && (session.user as any).id) {
    return (session.user as any).id as string;
  }

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trackingSessionId = params.id;

    if (!trackingSessionId) {
      return NextResponse.json(
        { error: "Tracking session id is required" },
        { status: 400 }
      );
    }

    // Ensure the tracking session belongs to the current user
    const trackingSession = await prisma.trackingSession.findFirst({
      where: { id: trackingSessionId, userId },
    });

    if (!trackingSession) {
      return NextResponse.json(
        { error: "Tracking session not found" },
        { status: 404 }
      );
    }

    // Basic counts
    const [locationCount, wifiCount, bleCount] = await Promise.all([
      prisma.location.count({
        where: { userId, trackingSessionId },
      }),
      prisma.wifiScan.count({
        where: {
          location: { userId, trackingSessionId },
        },
      }),
      prisma.bleScan.count({
        where: {
          location: { userId, trackingSessionId },
        },
      }),
    ]);

    // Top wifi networks by occurrence within the session
    const topWifiNetworks = await prisma.wifiScan.groupBy({
      by: ["bssid", "ssid"],
      where: {
        location: { userId, trackingSessionId },
      },
      _count: {
        bssid: true,
      },
      _avg: {
        rssi: true,
      },
      orderBy: {
        _count: {
          bssid: "desc",
        },
      },
      take: 20,
    });

    // Top BLE devices by occurrence within the session
    const topBleDevices = await prisma.bleScan.groupBy({
      by: ["address", "name"],
      where: {
        location: { userId, trackingSessionId },
      },
      _count: {
        address: true,
      },
      _avg: {
        rssi: true,
      },
      orderBy: {
        _count: {
          address: "desc",
        },
      },
      take: 20,
    });

    return NextResponse.json({
      trackingSession,
      summary: {
        locations: locationCount,
        wifiScans: wifiCount,
        bleScans: bleCount,
      },
      wifi: topWifiNetworks.map((w) => ({
        ssid: w.ssid,
        bssid: w.bssid,
        count: w._count && typeof w._count.bssid === 'number' ? w._count.bssid : 0,
        avgRssi: w._avg && typeof w._avg.rssi === 'number' ? w._avg.rssi : null,
      })),
      ble: topBleDevices.map((b) => ({
        name: b.name,
        address: b.address,
        count: b._count && typeof b._count.address === 'number' ? b._count.address : 0,
        avgRssi: b._avg && typeof b._avg.rssi === 'number' ? b._avg.rssi : null,
      })),
    });
  } catch (error) {
    console.error("Tracking session environment metrics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
