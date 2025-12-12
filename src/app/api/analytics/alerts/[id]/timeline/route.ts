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
        console.error("[/api/analytics/alerts/[id]/timeline] Invalid mobile token:", e);
      }
    }
  }

  const session = await getServerSession(authOptions);
  if (session && (session.user as any)?.id) {
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

    const alertId = params.id;

    const alert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        OR: [
          { userId },
          { alertRecipients: { some: { contactId: userId } } },
        ],
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        alertRecipients: {
          include: {
            contact: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        audioMessages: {
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    type TimelineEvent = {
      time: Date;
      kind: string;
      status?: string | null;
      byUserId?: string | null;
      byUserName?: string | null;
      recipientId?: string | null;
      recipientName?: string | null;
    };

    const events: TimelineEvent[] = [];

    // Alert created
    events.push({
      time: alert.createdAt,
      kind: "ALERT_CREATED",
      status: alert.status,
      byUserId: alert.userId,
      byUserName: alert.user?.name || alert.user?.email || null,
    });

    // Recipient notifications and status changes
    for (const r of alert.alertRecipients) {
      if (r.notifiedAt) {
        events.push({
          time: r.notifiedAt,
          kind: "RECIPIENT_NOTIFIED",
          recipientId: r.contactId,
          recipientName: r.contact?.name || r.contact?.email || null,
        });
      }

      const hasMeaningfulStatus = r.status && r.status !== "PENDING";
      if (hasMeaningfulStatus) {
        const statusTime = r.respondedAt || r.notifiedAt || r.createdAt;
        events.push({
          time: statusTime,
          kind: "RECIPIENT_STATUS_CHANGE",
          status: r.status,
          recipientId: r.contactId,
          recipientName: r.contact?.name || r.contact?.email || null,
        });
      }
    }

    // Audio messages in the thread
    for (const msg of alert.audioMessages) {
      events.push({
        time: msg.createdAt,
        kind: "AUDIO_SENT",
        byUserId: msg.senderId,
        byUserName: msg.sender?.name || msg.sender?.email || null,
      });
    }

    // Potential global status change (e.g., RESOLVED) based on updatedAt
    if (alert.status && alert.status !== "ACTIVE") {
      events.push({
        time: alert.updatedAt,
        kind: "ALERT_STATUS_CHANGE",
        status: alert.status,
        byUserId: alert.userId,
        byUserName: alert.user?.name || alert.user?.email || null,
      });
    }

    events.sort((a, b) => a.time.getTime() - b.time.getTime());

    return NextResponse.json({
      alert: {
        id: alert.id,
        title: alert.title,
        status: alert.status,
        createdAt: alert.createdAt.toISOString(),
        senderName: alert.user?.name || alert.user?.email || null,
      },
      events: events.map((e) => ({
        ...e,
        time: e.time.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[/api/analytics/alerts/[id]/timeline] Internal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
