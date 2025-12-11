import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lookupManufacturerFromMac } from "@/lib/macVendor";

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
        where: { location: { userId } },
        select: {
          ssid: true,
          bssid: true,
          rssi: true,
          location: {
            select: {
              timestamp: true,
              trackingSessionId: true,
            },
          },
        },
      }),
      prisma.bleScan.findMany({
        where: { location: { userId } },
        select: {
          name: true,
          address: true,
          rssi: true,
          location: {
            select: {
              timestamp: true,
              trackingSessionId: true,
            },
          },
        },
      }),
    ]);

    const wifiMap = new Map<
      string,
      {
        kind: "wifi";
        id: string;
        ssid: string | null;
        bssid: string;
        firstSeen: Date | null;
        lastSeen: Date | null;
        scanCount: number;
        hasSessions: boolean;
        manufacturer?: string | null;
      }
    >();

    for (const scan of wifiScans) {
      const key = scan.bssid;
      if (!key) continue;
      const ts = scan.location.timestamp;
      const entry =
        wifiMap.get(key) || {
          kind: "wifi" as const,
          id: key,
          ssid: scan.ssid ?? null,
          bssid: key,
          firstSeen: ts,
          lastSeen: ts,
          scanCount: 0,
          hasSessions: false,
          manufacturer: lookupManufacturerFromMac(key),
        };

      entry.ssid = entry.ssid || scan.ssid || null;
      if (!entry.firstSeen || ts < entry.firstSeen) entry.firstSeen = ts;
      if (!entry.lastSeen || ts > entry.lastSeen) entry.lastSeen = ts;
      entry.scanCount += 1;
      if (scan.location.trackingSessionId) {
        entry.hasSessions = true;
      }

      wifiMap.set(key, entry);
    }

    const bleMap = new Map<
      string,
      {
        kind: "ble";
        id: string;
        name: string | null;
        address: string;
        firstSeen: Date | null;
        lastSeen: Date | null;
        scanCount: number;
        hasSessions: boolean;
        manufacturer?: string | null;
      }
    >();

    for (const scan of bleScans) {
      const key = scan.address;
      if (!key) continue;
      const ts = scan.location.timestamp;
      const entry =
        bleMap.get(key) || {
          kind: "ble" as const,
          id: key,
          name: scan.name ?? null,
          address: key,
          firstSeen: ts,
          lastSeen: ts,
          scanCount: 0,
          hasSessions: false,
          manufacturer: lookupManufacturerFromMac(key),
        };

      entry.name = entry.name || scan.name || null;
      if (!entry.firstSeen || ts < entry.firstSeen) entry.firstSeen = ts;
      if (!entry.lastSeen || ts > entry.lastSeen) entry.lastSeen = ts;
      entry.scanCount += 1;
      if (scan.location.trackingSessionId) {
        entry.hasSessions = true;
      }

      bleMap.set(key, entry);
    }

    const wifi = Array.from(wifiMap.values()).sort((a, b) => {
      const aTime = a.lastSeen ? a.lastSeen.getTime() : 0;
      const bTime = b.lastSeen ? b.lastSeen.getTime() : 0;
      return bTime - aTime;
    });

    const ble = Array.from(bleMap.values()).sort((a, b) => {
      const aTime = a.lastSeen ? a.lastSeen.getTime() : 0;
      const bTime = b.lastSeen ? b.lastSeen.getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({
      wifi,
      ble,
    });
  } catch (error) {
    console.error("Environment devices error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const { kind, id } = await request.json();

    if (!kind || !id) {
      return NextResponse.json({ error: "kind and id are required" }, { status: 400 });
    }

    if (kind === "wifi") {
      const hasSessionScan = await prisma.wifiScan.findFirst({
        where: {
          bssid: id,
          location: {
            userId,
            NOT: { trackingSessionId: null },
          },
        },
        select: { id: true },
      });

      if (hasSessionScan) {
        return NextResponse.json(
          {
            error:
              "This Wi-Fi network is part of one or more tracking sessions. Delete those sessions first.",
          },
          { status: 409 }
        );
      }

      await prisma.wifiScan.deleteMany({
        where: {
          bssid: id,
          location: { userId },
        },
      });

      return NextResponse.json({ success: true });
    }

    if (kind === "ble") {
      const hasSessionScan = await prisma.bleScan.findFirst({
        where: {
          address: id,
          location: {
            userId,
            NOT: { trackingSessionId: null },
          },
        },
        select: { id: true },
      });

      if (hasSessionScan) {
        return NextResponse.json(
          {
            error:
              "This Bluetooth device is part of one or more tracking sessions. Delete those sessions first.",
          },
          { status: 409 }
        );
      }

      await prisma.bleScan.deleteMany({
        where: {
          address: id,
          location: { userId },
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported kind" }, { status: 400 });
  } catch (error) {
    console.error("Environment device delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
