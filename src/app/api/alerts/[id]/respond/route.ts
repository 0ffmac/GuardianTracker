import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { google } from "googleapis";

export const runtime = "nodejs";

const FCM_SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"];
const FCM_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

async function getFcmAccessToken(): Promise<string> {
  if (!FCM_PROJECT_ID) {
    throw new Error("FIREBASE_PROJECT_ID is not set");
  }

  const auth = new google.auth.GoogleAuth({
    scopes: FCM_SCOPES,
  });

  const client = await auth.getClient();
  const accessTokenObj = await client.getAccessToken();
  const accessToken = accessTokenObj?.token;

  if (!accessToken) {
    throw new Error("Unable to obtain FCM access token");
  }

  return accessToken;
}

async function sendAndroidAlertResponsePush(
  tokens: string[],
  payload: {
    alertId: string;
    action: string;
    responderName: string;
    responderId: string;
    creatorId: string;
    alertTitle: string;
  }
) {
  if (!tokens.length) return;

  const accessToken = await getFcmAccessToken();
  const url = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;

  const { alertId, action, responderName, responderId, creatorId, alertTitle } = payload;

  const actionLabel =
    action === "acknowledge"
      ? "acknowledged"
      : action === "dismiss"
      ? "dismissed"
      : "responded to";

  const title = `${responderName} ${actionLabel} your alert`;
  const body = alertTitle || "Tap to view the alert thread";

  for (const token of tokens) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title,
              body,
            },
            data: {
              type: "EMERGENCY_ALERT",
              event: "RECIPIENT_RESPONSE",
              alertId,
              action,
              fromUserId: responderId,
              fromUserName: responderName,
              toUserId: creatorId,
            },
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "<no body>");
        console.error("[alerts/[id]/respond] FCM v1 send failed", res.status, text);
      }
    } catch (err) {
      console.error("[alerts/[id]/respond] Error sending FCM v1 push", err);
    }
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    let userId: string;
    const alertId = params.id;

    // Check if this is a mobile request (with Bearer token) or web request (with session)
    const authHeader = request.headers.get('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Mobile request with JWT token
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const JWT_SECRET = process.env.NEXTAUTH_SECRET as string;

      if (!JWT_SECRET) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }

      // Verify the JWT token
      let decodedToken: any;
      try {
        decodedToken = jwt.verify(token, JWT_SECRET) as { userId: string; deviceId: string };
      } catch (error) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }

      userId = decodedToken.userId;
    } else {
      // Web request with NextAuth session
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      userId = (session.user as any).id as string;
    }
    
    // Verify that the alert exists and that the user is a recipient
    const alertRecipient = await prisma.alertRecipient.findFirst({
      where: {
        alertId,
        contactId: userId,
      },
      include: {
        alert: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    if (!alertRecipient) {
      return NextResponse.json({ error: "Alert not found or you are not a recipient" }, { status: 404 });
    }
    
    const { action } = await request.json();
    
    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    // Special case: allow alert creator to resolve the alert thread
    if (action === "resolve_sender") {
      const alert = await prisma.alert.findUnique({ where: { id: alertId } });
      if (!alert || alert.userId !== userId) {
        return NextResponse.json({ error: "Only the alert creator can resolve this alert" }, { status: 403 });
      }

      const updatedAlert = await prisma.alert.update({
        where: { id: alertId },
        data: { status: "RESOLVED" },
      });

      return NextResponse.json({
        success: true,
        alert: updatedAlert,
      });
    }
    
    let newStatus = alertRecipient.status;
    let respondedAt = alertRecipient.respondedAt;
    
    switch (action) {
      case "read":
        newStatus = "READ";
        break;
      case "respond":
        newStatus = "RESPONDED";
        respondedAt = new Date();
        break;
      case "dismiss":
        newStatus = "DISMISSED";
        respondedAt = new Date();
        break;
      case "acknowledge":
        newStatus = "ACKNOWLEDGED";
        respondedAt = new Date();
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    
    // Update the alert recipient status
    const updatedAlertRecipient = await prisma.alertRecipient.update({
      where: {
        id: alertRecipient.id,
      },
      data: {
        status: newStatus,
        respondedAt,
      },
    });

    // For non-read actions, notify the alert creator via push
    try {
      if (
        action !== "read" &&
        alertRecipient.alert &&
        alertRecipient.alert.user &&
        alertRecipient.alert.user.id &&
        alertRecipient.contact
      ) {
        const creatorUserId = alertRecipient.alert.user.id;
        const responder = alertRecipient.contact;

        const pushTokens = await (prisma as any).pushToken.findMany({
          where: {
            userId: creatorUserId,
            platform: "android",
          },
        });

        const distinctTokens: string[] = [];
        const seen = new Set<string>();
        for (const t of pushTokens || []) {
          const token = (t as any).token as string | undefined;
          if (token && !seen.has(token)) {
            seen.add(token);
            distinctTokens.push(token);
          }
        }

        if (distinctTokens.length > 0) {
          const responderName =
            responder.name || responder.email || "Emergency contact";
          const alertTitle = alertRecipient.alert.title || "Emergency Alert";

          await sendAndroidAlertResponsePush(distinctTokens, {
            alertId,
            action,
            responderName,
            responderId: responder.id,
            creatorId: creatorUserId,
            alertTitle,
          });
        }
      }
    } catch (err) {
      console.error(
        "[alerts/[id]/respond] Failed to send response push notifications",
        err
      );
    }

    return NextResponse.json({
      success: true,
      alertRecipient: updatedAlertRecipient,
    });
  } catch (error) {
    console.error("Error responding to alert:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}