import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
        console.error("[/api/analytics/suspicious_devices] Invalid mobile token:", e);
      }
    }
  }

  const session = await getServerSession(authOptions);
  if (session && (session.user as any)?.id) {
    return (session.user as any).id as string;
  }

  return null;
}

/**
 * GET /api/analytics/suspicious_devices
 *
 * Query params:
 * - from: ISO date/time (inclusive, default: last 7 days)
 * - to: ISO date/time (exclusive, default: now)
 * - limit: max devices to return (default: 20)
 * - alertId: optional alert to mark devices seen near this alert
 *
 * Response shape:
 * {
 *   range: { from: string, to: string },
 *   limit: number,
 *   topDevices: Array<{
 *     id: string,
 *     type: string,
 *     identifier: string,
 *     lastName: string | null,
 *     firstSeenAt: string,
 *     lastSeenAt: string,
 *     totalSightings: number,
 *     distinctLocationCount: number,
 *     suspicionScore: number,
 *     isSuspicious: boolean,
 *     seenNearAlert: boolean,
 *   }>,
 * }
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const limitParam = searchParams.get("limit");
    const alertId = searchParams.get("alertId");

    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const from = fromParam ? new Date(fromParam) : defaultFrom;
    const to = toParam ? new Date(toParam) : now;

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json({ error: "Invalid from/to" }, { status: 400 });
    }

    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100);

    // Find all app devices for this user, then suspicious tracked devices for those devices.
    const userDevices = await prisma.device.findMany({
      where: { userId },
      select: { id: true },
    });
    const deviceIds = userDevices.map((d) => d.id);

    if (!deviceIds.length) {
      return NextResponse.json({
        range: { from: from.toISOString(), to: to.toISOString() },
        limit,
        topDevices: [],
      });
    }

    const suspiciousTracked = await prisma.trackedDevice.findMany({
      where: {
        userDeviceId: { in: deviceIds },
        lastSeenAt: {
          gte: from,
          lt: to,
        },
        isSuspicious: true,
      },
      orderBy: {
        suspicionScore: "desc",
      },
      take: limit,
    });

    let seenNearAlertKeys = new Set<string>();

    if (alertId) {
      // Load alert time range and check which tracked devices had observations near this alert.
      const alert = await prisma.alert.findFirst({
        where: { id: alertId, userId },
        select: { createdAt: true },
      });

      if (alert) {
        const windowMs = 30 * 60 * 1000; // +/- 30 minutes
        const alertFrom = new Date(alert.createdAt.getTime() - windowMs);
        const alertTo = new Date(alert.createdAt.getTime() + windowMs);

        const observations = await prisma.deviceObservation.findMany({
          where: {
            userDeviceId: { in: deviceIds },
            timestamp: {
              gte: alertFrom,
              lt: alertTo,
            },
          },
          select: {
            userDeviceId: true,
            type: true,
            identifier: true,
          },
        });

        for (const obs of observations) {
          const key = `${obs.userDeviceId}:${obs.type}:${obs.identifier}`;
          seenNearAlertKeys.add(key);
        }
      }
    }

    const topDevices = suspiciousTracked.map((td) => {
      const key = `${td.userDeviceId}:${td.type}:${td.identifier}`;
      return {
        id: td.id,
        type: td.type,
        identifier: td.identifier,
        lastName: td.lastName,
        firstSeenAt: td.firstSeenAt.toISOString(),
        lastSeenAt: td.lastSeenAt.toISOString(),
        totalSightings: td.totalSightings,
        distinctLocationCount: td.distinctLocationCount,
        suspicionScore: td.suspicionScore,
        isSuspicious: td.isSuspicious,
        seenNearAlert: seenNearAlertKeys.has(key),
      };
    });

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      limit,
      topDevices,
    });
  } catch (error) {
    console.error("[/api/analytics/suspicious_devices] Internal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
