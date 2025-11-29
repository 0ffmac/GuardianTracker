import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const runtime = "nodejs";

const MIN_DISTANCE_METERS = 3;

const toRad = (value: number) => (value * Math.PI) / 180;

const distanceInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371000; // meters
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
};

export async function POST(request: Request) {
  try {
    let userId: string;
    let deviceId: string | null = null;
    let mobileToken: string | null = null;

    // Try to authenticate via JWT (for mobile clients)
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
        mobileToken = token;
      } catch (error) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    } else {
      // Fallback to next-auth session (for web clients)
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = (session.user as any).id;
      // deviceId is not typically part of next-auth web session, can be null or derived differently if needed
      deviceId = (session.user as any).deviceId || null;
    }

    const rawBody = await request.json() as any;

    const latitude =
      typeof rawBody.latitude === "number"
        ? rawBody.latitude
        : typeof rawBody.lat === "number"
        ? rawBody.lat
        : undefined;
    const longitude =
      typeof rawBody.longitude === "number"
        ? rawBody.longitude
        : typeof rawBody.lon === "number"
        ? rawBody.lon
        : typeof rawBody.lng === "number"
        ? rawBody.lng
        : undefined;

    const accuracy = rawBody.accuracy;
    const altitude = rawBody.altitude;
    const speed = rawBody.speed;
    const timestamp = rawBody.timestamp || rawBody.time || rawBody.created_at;

    const trackingSessionId =
      rawBody.trackingSessionId ||
      rawBody.tracking_session_id ||
      rawBody.sessionId ||
      rawBody.session_id ||
      null;

    const wifiScans = rawBody.wifiScans || rawBody.wifi_scans || [];
    const bleScans = rawBody.bleScans || rawBody.ble_scans || [];

    console.log(`[update_location] Incoming location for userId: ${userId}, deviceId: ${deviceId}, trackingSessionId: ${trackingSessionId}`);

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    // (Reverted) No accuracy filter, always save point

    // Find last stored location for this user/session (or user/device)
    const lastLocation = await prisma.location.findFirst({
      where: trackingSessionId
        ? { userId, trackingSessionId }
        : { userId, deviceId: deviceId ?? undefined },
      orderBy: { timestamp: "desc" },
    });

    let location = null;

    if (lastLocation) {
      const dist = distanceInMeters(
        lastLocation.latitude,
        lastLocation.longitude,
        latitude,
        longitude
      );

      if (dist < MIN_DISTANCE_METERS) {
        // Too close to last point: skip insert but still update activity
        if (mobileToken && deviceId) {
          await prisma.device.update({
            where: { id: deviceId },
            data: { lastSeen: new Date() },
          });

          await prisma.mobileSession.updateMany({
            where: { token: mobileToken, userId },
            data: { lastActivity: new Date() },
          });
        }

        return NextResponse.json({
          success: true,
          skipped: true,
          reason: "movement_below_threshold",
          distanceMeters: dist,
        });
      }
    }

    // Create location record
    location = await prisma.location.create({
      data: {
        latitude,
        longitude,
        accuracy: accuracy || null,
        altitude: altitude || null,
        speed: speed || null,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        userId,
        deviceId,
        trackingSessionId,
      },
    });

    // Persist wifi and BLE scans associated with this location
    if (Array.isArray(wifiScans) && wifiScans.length > 0) {
      const wifiData = wifiScans
        .filter((scan: any) => scan && scan.ssid && scan.bssid)
        .map((scan: any) => ({
          ssid: String(scan.ssid),
          bssid: String(scan.bssid),
          rssi: Number(scan.rssi ?? 0),
          frequency:
            scan.frequency !== undefined && scan.frequency !== null
              ? Number(scan.frequency)
              : null,
          locationId: location.id,
        }));

      if (wifiData.length > 0) {
        // Use individual creates instead of createMany for compatibility
        for (const row of wifiData) {
          await prisma.wifiScan.create({ data: row });
        }
      }
    }

    if (Array.isArray(bleScans) && bleScans.length > 0) {
      const bleData = bleScans
        .filter((scan: any) => scan && scan.address)
        .map((scan: any) => ({
          name: scan.name ? String(scan.name) : null,
          address: String(scan.address),
          rssi: Number(scan.rssi ?? 0),
          locationId: location.id,
        }));

      if (bleData.length > 0) {
        // Use individual creates instead of createMany for compatibility
        for (const row of bleData) {
          await prisma.bleScan.create({ data: row });
        }
      }
    }

    // If authenticated via mobile token, update device last seen and mobile session last activity
    if (mobileToken && deviceId) {
      await prisma.device.update({
        where: { id: deviceId },
        data: { lastSeen: new Date() },
      });

      await prisma.mobileSession.updateMany({
        where: { token: mobileToken, userId },
        data: { lastActivity: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      location,
    });
  } catch (error) {
    console.error("Location update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}