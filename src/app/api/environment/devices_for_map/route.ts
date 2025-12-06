import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;

    const [wifiScans, bleScans] = await Promise.all([
      prisma.wifiScan.findMany({
        where: {
          location: { userId },
        },
        select: {
          ssid: true,
          bssid: true,
          rssi: true,
          location: {
            select: {
              latitude: true,
              longitude: true,
              timestamp: true,
            },
          },
        },
      }),
      prisma.bleScan.findMany({
        where: {
          location: { userId },
        },
        select: {
          name: true,
          address: true,
          rssi: true,
          location: {
            select: {
              latitude: true,
              longitude: true,
              timestamp: true,
            },
          },
        },
      }),
    ]);

    type WifiAgg = {
      bssid: string;
      ssid: string | null;
      count: number;
      avgRssi: number | null;
      latitudeSum: number;
      longitudeSum: number;
      firstSeen: Date | null;
      lastSeen: Date | null;
    };

    type BleAgg = {
      address: string;
      name: string | null;
      count: number;
      avgRssi: number | null;
      latitudeSum: number;
      longitudeSum: number;
      firstSeen: Date | null;
      lastSeen: Date | null;
    };

    const wifiMap = new Map<string, WifiAgg>();

    for (const scan of wifiScans) {
      const key = scan.bssid;
      const loc = scan.location;
      if (!key || loc.latitude == null || loc.longitude == null) continue;

      const existing = wifiMap.get(key);
      const ts = loc.timestamp;

      if (!existing) {
        wifiMap.set(key, {
          bssid: key,
          ssid: scan.ssid ?? null,
          count: 1,
          avgRssi: scan.rssi ?? null,
          latitudeSum: loc.latitude,
          longitudeSum: loc.longitude,
          firstSeen: ts,
          lastSeen: ts,
        });
      } else {
        existing.count += 1;
        if (scan.rssi != null) {
          const prevAvg = existing.avgRssi ?? scan.rssi;
          existing.avgRssi = (prevAvg * (existing.count - 1) + scan.rssi) / existing.count;
        }
        existing.latitudeSum += loc.latitude;
        existing.longitudeSum += loc.longitude;
        if (!existing.firstSeen || ts < existing.firstSeen) existing.firstSeen = ts;
        if (!existing.lastSeen || ts > existing.lastSeen) existing.lastSeen = ts;
      }
    }

    const bleMap = new Map<string, BleAgg>();

    for (const dev of bleScans) {
      const key = dev.address;
      const loc = dev.location;
      if (!key || loc.latitude == null || loc.longitude == null) continue;

      const existing = bleMap.get(key);
      const ts = loc.timestamp;

      if (!existing) {
        bleMap.set(key, {
          address: key,
          name: dev.name ?? null,
          count: 1,
          avgRssi: dev.rssi ?? null,
          latitudeSum: loc.latitude,
          longitudeSum: loc.longitude,
          firstSeen: ts,
          lastSeen: ts,
        });
      } else {
        existing.count += 1;
        if (dev.rssi != null) {
          const prevAvg = existing.avgRssi ?? dev.rssi;
          existing.avgRssi = (prevAvg * (existing.count - 1) + dev.rssi) / existing.count;
        }
        existing.latitudeSum += loc.latitude;
        existing.longitudeSum += loc.longitude;
        if (!existing.firstSeen || ts < existing.firstSeen) existing.firstSeen = ts;
        if (!existing.lastSeen || ts > existing.lastSeen) existing.lastSeen = ts;
      }
    }

    const wifi = Array.from(wifiMap.values()).map((w) => ({
      bssid: w.bssid,
      ssid: w.ssid,
      count: w.count,
      avgRssi: w.avgRssi,
      latitude: w.latitudeSum / w.count,
      longitude: w.longitudeSum / w.count,
      firstSeen: w.firstSeen,
      lastSeen: w.lastSeen,
    }));

    const ble = Array.from(bleMap.values()).map((b) => ({
      address: b.address,
      name: b.name,
      count: b.count,
      avgRssi: b.avgRssi,
      latitude: b.latitudeSum / b.count,
      longitude: b.longitudeSum / b.count,
      firstSeen: b.firstSeen,
      lastSeen: b.lastSeen,
    }));

    return NextResponse.json({
      wifi,
      ble,
    });
  } catch (error) {
    console.error("Environment devices_for_map error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
