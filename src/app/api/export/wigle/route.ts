import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function formatTimestamp(date: Date): string {
  // WiGLE expects SQL-style UTC timestamps: YYYY-MM-DD HH:MM:SS
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;

    const url = new URL(request.url);
    const trackingSessionId = url.searchParams.get("trackingSessionId");

    if (!trackingSessionId) {
      return NextResponse.json(
        { error: "trackingSessionId query parameter is required" },
        { status: 400 }
      );
    }

    const [wifiScans, bleScans] = await Promise.all([
      prisma.wifiScan.findMany({
        where: {
          location: {
            userId,
            trackingSessionId,
          },
        },
        include: {
          location: {
            select: {
              latitude: true,
              longitude: true,
              altitude: true,
              accuracy: true,
              timestamp: true,
            },
          },
        },
        orderBy: {
          location: {
            timestamp: "asc",
          },
        },
      }),
      prisma.bleScan.findMany({
        where: {
          location: {
            userId,
            trackingSessionId,
          },
        },
        include: {
          location: {
            select: {
              latitude: true,
              longitude: true,
              altitude: true,
              accuracy: true,
              timestamp: true,
            },
          },
        },
        orderBy: {
          location: {
            timestamp: "asc",
          },
        },
      }),
    ]);

    // WiGLE CSV v1.6 pre-header describing the generating app/device
    const preHeader =
      "WigleWifi-1.6,appRelease=GuardianTracker,model=web,release=1.0,device=guardian-tracking,display=browser,board=web,brand=Guardian,star=Sol,body=3,subBody=1";

    // WiGLE CSV v1.6 header
    const header = [
      "MAC",
      "SSID",
      "AuthMode",
      "FirstSeen",
      "Channel",
      "Frequency",
      "RSSI",
      "CurrentLatitude",
      "CurrentLongitude",
      "AltitudeMeters",
      "AccuracyMeters",
      "RCOIs",
      "MfgrId",
      "Type",
    ];

    const rows: string[] = [preHeader, header.join(",")];

    // Wi-Fi rows (Type=WIFI)
    for (const scan of wifiScans) {
      const loc = scan.location;
      const values = [
        scan.bssid ?? "", // MAC / BSSID
        scan.ssid ?? "", // SSID
        "", // AuthMode / capabilities (not currently captured)
        formatTimestamp(loc.timestamp), // FirstSeen (UTC)
        "", // Channel (unknown, frequency only)
        scan.frequency != null ? String(scan.frequency) : "", // Frequency in MHz
        scan.rssi != null ? String(scan.rssi) : "", // RSSI
        loc.latitude != null ? String(loc.latitude) : "", // CurrentLatitude
        loc.longitude != null ? String(loc.longitude) : "", // CurrentLongitude
        loc.altitude != null ? String(loc.altitude) : "", // AltitudeMeters
        loc.accuracy != null ? String(loc.accuracy) : "", // AccuracyMeters
        "", // RCOIs
        "", // MfgrId
        "WIFI", // Type
      ];

      const escaped = values.map((v) => csvEscape(v));
      rows.push(escaped.join(","));
    }

    // Bluetooth rows (Type=BLE), based on WiGLE Bluetooth row format
    for (const dev of bleScans) {
      const loc = dev.location;
      const values = [
        dev.address ?? "", // BD_ADDR
        dev.name ?? "", // Device Name
        "Misc [LE]", // Capabilities / type hint
        formatTimestamp(loc.timestamp), // FirstSeen (UTC)
        "0", // Channel for Bluetooth devices
        "", // Frequency / device type code (unknown)
        dev.rssi != null ? String(dev.rssi) : "", // RSSI
        loc.latitude != null ? String(loc.latitude) : "", // CurrentLatitude
        loc.longitude != null ? String(loc.longitude) : "", // CurrentLongitude
        loc.altitude != null ? String(loc.altitude) : "", // AltitudeMeters
        loc.accuracy != null ? String(loc.accuracy) : "", // AccuracyMeters
        "", // RCOIs
        "", // MfgrId
        "BLE", // Type
      ];

      const escaped = values.map((v) => csvEscape(v));
      rows.push(escaped.join(","));
    }

    const csv = rows.join("\r\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="wigle-session-${trackingSessionId}.csv"`,
      },
    });
  } catch (error) {
    console.error("Wigle export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
