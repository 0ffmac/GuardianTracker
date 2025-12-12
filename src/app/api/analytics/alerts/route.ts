import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Normalize auth so analytics can be called from both web and mobile.
 */
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
        console.error("[/api/analytics/alerts] Invalid mobile token:", e);
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
 * GET /api/analytics/alerts
 *
 * Query params:
 * - from: ISO date/time (inclusive)
 * - to: ISO date/time (exclusive)
 * - bucket: "hour" | "day" (default: "day")
 * - type: "sent" | "received" | "all" (default: "all")
 * - alertId: optional specific alert to focus on
 *
 * Response shape:
 * {
 *   range: { from: string, to: string },
 *   bucket: "hour" | "day",
 *   totals: {
 *     alerts: number,
 *     sent: number,
 *     received: number,
 *   },
 *   byStatus: { [status: string]: number },
 *   timeBuckets: Array<{
 *     start: string,
 *     end: string,
 *     total: number,
 *     byStatus: { [status: string]: number },
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
    const bucket = (searchParams.get("bucket") || "day").toLowerCase();
    const type = (searchParams.get("type") || "all").toLowerCase();
    const alertId = searchParams.get("alertId");

    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // last 7 days

    const from = fromParam ? new Date(fromParam) : defaultFrom;
    const to = toParam ? new Date(toParam) : now;

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json({ error: "Invalid from/to" }, { status: 400 });
    }

    // Base where clauses for sent/received alerts
    const sentWhere: any = {
      userId,
      createdAt: {
        gte: from,
        lt: to,
      },
    };

    const receivedWhere: any = {
      alertRecipients: {
        some: {
          contactId: userId,
        },
      },
      createdAt: {
        gte: from,
        lt: to,
      },
    };

    if (alertId) {
      sentWhere.id = alertId;
      receivedWhere.id = alertId;
    }

    const includeSent = type === "sent" || type === "all";
    const includeReceived = type === "received" || type === "all";

    const [sentAlerts, receivedAlerts, recipientRows] = await Promise.all([
      includeSent
        ? prisma.alert.findMany({
            where: sentWhere,
            select: { id: true, status: true, createdAt: true },
          })
        : Promise.resolve([]),
      includeReceived
        ? prisma.alert.findMany({
            where: receivedWhere,
            select: {
              id: true,
              status: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      prisma.alertRecipient.findMany({
        where: {
          contactId: userId,
          alert: {
            createdAt: {
              gte: from,
              lt: to,
            },
            ...(alertId ? { id: alertId } : {}),
          },
        },
        select: {
          status: true,
          alert: {
            select: { createdAt: true },
          },
        },
      }),
    ]);

    type Bucket = {
      start: Date;
      end: Date;
      total: number;
      byStatus: Record<string, number>;
    };

    const allAlerts = [...sentAlerts, ...receivedAlerts];
    const byStatus: Record<string, number> = {};

    // Determine bucket boundaries
    const buckets: Bucket[] = [];
    const bucketMs = bucket === "hour" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const startMs = from.getTime();
    const endMs = to.getTime();

    for (let t = startMs; t < endMs; t += bucketMs) {
      buckets.push({
        start: new Date(t),
        end: new Date(Math.min(t + bucketMs, endMs)),
        total: 0,
        byStatus: {},
      });
    }

    for (const alert of allAlerts) {
      const createdAt = (alert as any).createdAt as Date;
      const status = (alert as any).status || "UNKNOWN";

      byStatus[status] = (byStatus[status] || 0) + 1;

      const t = createdAt.getTime();
      if (t < startMs || t >= endMs) continue;
      const index = Math.floor((t - startMs) / bucketMs);
      const bucketEntry = buckets[index];
      if (!bucketEntry) continue;
      bucketEntry.total += 1;
      bucketEntry.byStatus[status] = (bucketEntry.byStatus[status] || 0) + 1;
    }

    // Recipient-level aggregation ("my" status for received alerts)
    const recipientByStatus: Record<string, number> = {};
    const recipientBuckets: Bucket[] = buckets.map((b) => ({
      start: new Date(b.start),
      end: new Date(b.end),
      total: 0,
      byStatus: {},
    }));

    for (const row of recipientRows) {
      const status = (row as any).status || "UNKNOWN";
      const createdAt = (row as any).alert.createdAt as Date;

      recipientByStatus[status] = (recipientByStatus[status] || 0) + 1;

      const t = createdAt.getTime();
      if (t < startMs || t >= endMs) continue;
      const index = Math.floor((t - startMs) / bucketMs);
      const bucketEntry = recipientBuckets[index];
      if (!bucketEntry) continue;
      bucketEntry.total += 1;
      bucketEntry.byStatus[status] = (bucketEntry.byStatus[status] || 0) + 1;
    }

    const result = {
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      bucket: bucket === "hour" ? "hour" : "day",
      totals: {
        alerts: allAlerts.length,
        sent: sentAlerts.length,
        received: receivedAlerts.length,
      },
      byStatus,
      timeBuckets: buckets.map((b) => ({
        start: b.start.toISOString(),
        end: b.end.toISOString(),
        total: b.total,
        byStatus: b.byStatus,
      })),
      recipientByStatus,
      recipientTimeBuckets: recipientBuckets.map((b) => ({
        start: b.start.toISOString(),
        end: b.end.toISOString(),
        total: b.total,
        byStatus: b.byStatus,
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/analytics/alerts] Internal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
