import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
export const runtime = "nodejs";
const MIN_DISTANCE_METERS = 3;
const MAX_ACCURACY_METERS = 50;
const MIN_SIGHTINGS_FOR_SUSPICION = 5;
const MIN_DISTINCT_PLACES_FOR_SUSPICION = 3;
const PLACE_CELL_DECIMALS = 3; // ~100–150m
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
const computePlaceKey = (latitude: number, longitude: number) => {
  const factor = Math.pow(10, PLACE_CELL_DECIMALS);
  const latCell = Math.round(latitude * factor) / factor;
  const lonCell = Math.round(longitude * factor) / factor;
  return `${latCell.toFixed(PLACE_CELL_DECIMALS)},${lonCell.toFixed(
    PLACE_CELL_DECIMALS
  )}`;
};
async function recordDeviceObservationAndTrackedDevice(params: {
  userDeviceId: string | null;
  trackingSessionId: string | null;
  type: "wifi" | "ble";
  identifier: string;
  name: string | null;
  rssi: number;
  latitude: number;
  longitude: number;
  timestamp: Date;
}) {
  const {
    userDeviceId,
    trackingSessionId,
    type,
    identifier,
    name,
    rssi,
    latitude,
    longitude,
    timestamp,
  } = params;
  if (!userDeviceId) {
    // Suspicious-device logic is keyed per app device; without it we skip.
    return;
  }
  const placeKey = computePlaceKey(latitude, longitude);
  await prisma.$transaction(async (tx) => {
    await (tx as any).deviceObservation.create({
      data: {
        userDeviceId,
        trackingSessionId: trackingSessionId || undefined,
        type,
        identifier,
        name,
        rssi,
        latitude,
        longitude,
        timestamp,
      },
    });
    const trackedDeviceUpdateData: any = {
      lastSeenAt: timestamp,
      totalSightings: { increment: 1 },
    };
    if (name && name.trim().length > 0) {
      trackedDeviceUpdateData.lastName = name;
    }
    const trackedDevice = await (tx as any).trackedDevice.upsert({
      where: {
        userDeviceId_type_identifier: {
          userDeviceId,
          type,
          identifier,
        },
      },
      create: {
        userDeviceId,
        type,
        identifier,
        lastName: name && name.trim().length > 0 ? name : null,
        firstSeenAt: timestamp,
        lastSeenAt: timestamp,
        totalSightings: 1,
        distinctLocationCount: 0,
        suspicionScore: 0,
        isSuspicious: false,
      },
      update: trackedDeviceUpdateData,
    });
    await (tx as any).devicePlace.upsert({
      where: {
        trackedDeviceId_placeKey: {
          trackedDeviceId: trackedDevice.id,
          placeKey,
        },
      },
      create: {
        trackedDeviceId: trackedDevice.id,
        placeKey,
        firstSeenAt: timestamp,
        lastSeenAt: timestamp,
        count: 1,
      },
      update: {
        lastSeenAt: timestamp,
        count: {
          increment: 1,
        },
      },
    });
    const distinctLocationCount = await (tx as any).devicePlace.count({
      where: {
        trackedDeviceId: trackedDevice.id,
      },
    });
    const suspicionScore =
      trackedDevice.totalSightings + 3 * distinctLocationCount;
    const isSuspicious =
      trackedDevice.totalSightings >= MIN_SIGHTINGS_FOR_SUSPICION &&
      distinctLocationCount >= MIN_DISTINCT_PLACES_FOR_SUSPICION;
    await (tx as any).trackedDevice.update({
      where: { id: trackedDevice.id },
      data: {
        distinctLocationCount,
        suspicionScore,
        isSuspicious,
      },
    });
  });
}
async function processSingleLocation(
  rawBody: any,
  userId: string,
  deviceId: string | null,
  mobileToken: string | null
): Promise<{ status: number; payload: any }> {
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
  const rawSource =
    rawBody.source ||
    rawBody.locationSource ||
    rawBody.location_source ||
    rawBody.positionSource ||
    rawBody.position_source;
  let locationSource = "gps";
  if (typeof rawSource === "string") {
    const normalized = rawSource.toLowerCase();
    if (normalized === "wifi" || normalized === "hybrid" || normalized === "gps") {
      locationSource = normalized;
    }
  }
  const trackingSessionId =
    rawBody.trackingSessionId ||
    rawBody.tracking_session_id ||
    rawBody.sessionId ||
    rawBody.session_id ||
    null;
  const wifiScans = rawBody.wifiScans || rawBody.wifi_scans || [];
  const bleScans = rawBody.bleScans || rawBody.ble_scans || [];
  console.log(
    `[update_location] Incoming location for userId: ${userId}, deviceId: ${deviceId}, trackingSessionId: ${trackingSessionId}`
  );
  console.log("[DEBUG] Received location payload:", {
    latitude,
    longitude,
    rawLatitude: rawBody.latitude,
    rawLongitude: rawBody.longitude,
    trackingSessionId,
    userId,
    deviceId,
    mobileToken,
    rawBody,
  });
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return {
      status: 400,
      payload: { error: "Invalid coordinates" },
    };
  }
  // Filter out very inaccurate points to reduce jitter
  if (typeof accuracy === "number" && accuracy > MAX_ACCURACY_METERS) {
    // Still touch device/session activity so the tracker stays "alive"
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
    return {
      status: 200,
      payload: {
        success: true,
        skipped: true,
        reason: "low_gps_accuracy",
        accuracyMeters: accuracy,
      },
    };
  }
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
      return {
        status: 200,
        payload: {
          success: true,
          skipped: true,
          reason: "movement_below_threshold",
          distanceMeters: dist,
        },
      };
    }
  }
  // Create location record
  const locationTimestamp = timestamp ? new Date(timestamp) : new Date();
  location = await (prisma as any).location.create({
    data: {
      latitude,
      longitude,
      accuracy: accuracy || null,
      altitude: altitude || null,
      speed: speed || null,
      timestamp: locationTimestamp,
      source: locationSource,
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
        await recordDeviceObservationAndTrackedDevice({
          userDeviceId: deviceId,
          trackingSessionId,
          type: "wifi",
          identifier: row.bssid,
          name: row.ssid,
          rssi: row.rssi,
          latitude,
          longitude,
          timestamp: locationTimestamp,
        });
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
        await recordDeviceObservationAndTrackedDevice({
          userDeviceId: deviceId,
          trackingSessionId,
          type: "ble",
          identifier: row.address,
          name: row.name,
          rssi: row.rssi,
          latitude,
          longitude,
          timestamp: locationTimestamp,
        });
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
  return {
    status: 200,
    payload: {
      success: true,
      location,
    },
  };
}
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
    const rawBody = (await request.json()) as any;
    // NEW: Batch handling. Accept either an array body
    // or an object with `locations`/`points` array.
    const locationsArray = Array.isArray(rawBody)
      ? rawBody
      : Array.isArray(rawBody.locations)
      ? rawBody.locations
      : Array.isArray(rawBody.points)
      ? rawBody.points
      : null;
    if (locationsArray) {
      // Optional top-level tracking session to apply as default
      const topLevelTrackingSessionId =
        rawBody.trackingSessionId ||
        rawBody.tracking_session_id ||
        rawBody.sessionId ||
        rawBody.session_id ||
        null;
      const results: { status: number; payload: any }[] = [];
      for (const loc of locationsArray) {
        const mergedBody =
          topLevelTrackingSessionId &&
          (loc.trackingSessionId === undefined &&
            loc.tracking_session_id === undefined &&
            loc.sessionId === undefined &&
            loc.session_id === undefined)
            ? { ...loc, trackingSessionId: topLevelTrackingSessionId }
            : loc;
        const result = await processSingleLocation(
          mergedBody,
          userId,
          deviceId,
          mobileToken
        );
        results.push(result);
      }
      const insertedCount = results.filter(
        (r) =>
          r.status === 200 &&
          r.payload &&
          r.payload.success &&
          !r.payload.skipped
      ).length;
      const skippedCount = results.filter(
        (r) => r.status === 200 && r.payload && r.payload.skipped
      ).length;
      const errored = results.filter((r) => r.status >= 400);
      // If any hard errors occurred, surface a 207-like summary but keep body JSON.
      if (errored.length > 0 && insertedCount === 0) {
        return NextResponse.json(
          {
            success: false,
            batch: {
              total: locationsArray.length,
              inserted: insertedCount,
              skipped: skippedCount,
              errors: errored.map((e) => e.payload),
            },
          },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        batch: {
          total: locationsArray.length,
          inserted: insertedCount,
          skipped: skippedCount,
        },
      });
    }
    // Single-point payload (existing behavior)
    const result = await processSingleLocation(
      rawBody,
      userId,
      deviceId,
      mobileToken
    );
    return NextResponse.json(result.payload, { status: result.status });
  } catch (error) {
    console.error("Location update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}