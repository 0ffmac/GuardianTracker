import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function formatTimestamp(date: Date): string {
  // Format similar to common Wigle CSV: YYYY-MM-DD HH:MM:SS
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
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

    const wifiScans = await prisma.wifiScan.findMany({
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
    });

    // Basic Wigle-like Wi-Fi CSV header
    const header = [
      "MAC",
      "SSID",
      "AuthMode",
      "FirstSeen",
      "Channel",
      "RSSI",
      "CurrentLatitude",
      "CurrentLongitude",
      "AltitudeMeters",
      "AccuracyMeters",
      "Type",
    ];

    const rows: string[] = [header.join(",")];

    for (const scan of wifiScans) {
      const loc = scan.location;
      const values = [
        scan.bssid ?? "", // MAC
        scan.ssid ?? "", // SSID
        "", // AuthMode (not currently captured)
        formatTimestamp(loc.timestamp), // FirstSeen
        scan.frequency != null ? String(scan.frequency) : "", // Channel / frequency
        scan.rssi != null ? String(scan.rssi) : "", // RSSI
        loc.latitude != null ? String(loc.latitude) : "", // CurrentLatitude
        loc.longitude != null ? String(loc.longitude) : "", // CurrentLongitude
        loc.altitude != null ? String(loc.altitude) : "", // AltitudeMeters
        loc.accuracy != null ? String(loc.accuracy) : "", // AccuracyMeters
        "WIFI", // Type
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
