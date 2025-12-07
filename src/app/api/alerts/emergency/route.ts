import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import fs from "fs/promises";
import path from "path";
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

  console.log('Access token obtained for FCM', accessToken);
  return accessToken;
}

async function sendAndroidEmergencyPush(tokens: string[], alert: any) {
  if (!tokens.length) return;

  const accessToken = await getFcmAccessToken();
  const url = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;

  const title = `Emergency Alert from ${
    alert.user?.name || alert.user?.email || "Guardian"
  }`;
  const body = alert.description || "Tap to open emergency alert";

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
              alertId: alert.id,
              fromUserId: alert.userId,
              fromUserName:
                alert.user?.name || alert.user?.email || "Guardian",
            },
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "<no body>");
        console.error("[alerts/emergency] FCM v1 send failed", res.status, text);
      }
    } catch (err) {
      console.error("[alerts/emergency] Error sending FCM v1 push", err);
    }
  }
}

export async function POST(request: Request) {
  try {
    let userId: string;

    // Check if this is a mobile request (with Bearer token) or web request (with session)
    const authHeader = request.headers.get("Authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
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
      // Web request with NextAuth session - this probably shouldn't be used
      // but adding for consistency
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      userId = (session.user as any).id as string;
    }

    const contentType = request.headers.get("Content-Type") || "";

    let title: string | null = null;
    let description: string | null = null;
    let uploadedAudioFile: File | null = null;
    let uploadedAudioDuration: number | undefined;
    let uploadedAudioType: string | undefined;
    let externalAudioUrl: string | null = null;
    let externalAudioDuration: number | undefined;
    let externalAudioType: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      // Mobile (or web) sending alert + audio in one multipart request
      const formData = await request.formData();
      title = (formData.get("title") as string) || null;
      description = (formData.get("description") as string) || null;
      uploadedAudioFile = formData.get("audioFile") as File | null;
      uploadedAudioType = (formData.get("contentType") as string) || undefined;
      const durationStr = formData.get("duration") as string | null;
      uploadedAudioDuration = durationStr ? parseFloat(durationStr) : undefined;

      // Also support a direct URL field if mobile already uploaded audio elsewhere
      externalAudioUrl = (formData.get("audioUrl") as string) || null;
      const externalDurationStr = formData.get("audioDuration") as string | null;
      externalAudioDuration = externalDurationStr ? parseFloat(externalDurationStr) : undefined;
      externalAudioType = (formData.get("audioType") as string) || undefined;
    } else {
      // JSON body (current web behavior)
      const body = await request.json();
      title = body.title ?? null;
      description = body.description ?? null;
      externalAudioUrl = body.audioUrl ?? body.audioContentUrl ?? null;
      externalAudioDuration = body.audioDuration ?? undefined;
      externalAudioType = body.audioType ?? undefined;
    }

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Create the alert
    const alert = await prisma.alert.create({
      data: {
        userId,
        title,
        description: description || undefined,
        status: "ACTIVE",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // If we received audio with the emergency, create an AudioMessage for it
    if (uploadedAudioFile || externalAudioUrl) {
      let contentUrl: string | null = null;
      let contentTypeForAudio: string = externalAudioType || uploadedAudioType || "audio/webm";
      let durationForAudio: number | undefined = uploadedAudioDuration ?? externalAudioDuration;

      if (uploadedAudioFile) {
        // Persist uploaded audio to disk under public/audio
        const uploadDir = path.join(process.cwd(), "public", "audio");
        await fs.mkdir(uploadDir, { recursive: true });

        const extension = uploadedAudioFile.type === "audio/mpeg" ? ".mp3" : ".webm";
        const fileName = `${alert.id}-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
        const filePath = path.join(uploadDir, fileName);

        const arrayBuffer = await uploadedAudioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.writeFile(filePath, buffer);

        contentUrl = `/api/audio/${fileName}`;
        if (!uploadedAudioType) {
          contentTypeForAudio = uploadedAudioFile.type || contentTypeForAudio;
        }
      } else if (externalAudioUrl) {
        // Use the provided URL directly (e.g. mobile uploaded elsewhere)
        contentUrl = externalAudioUrl;
      }

      if (contentUrl) {
        await prisma.audioMessage.create({
          data: {
            alertId: alert.id,
            senderId: userId,
            receiverId: null, // broadcast to all recipients
            contentUrl,
            contentType: contentTypeForAudio,
            duration: durationForAudio,
            status: "SENT",
          },
        });
      }
    }

    // Get the contacts who have added this user as an emergency contact
    // ("trusted by" – people who chose me as their emergency contact)
    const contactsWhoTrustMe = await prisma.trustedContact.findMany({
      where: {
        contactId: userId,
        status: "ACCEPTED",
        receiveEmergencyAlerts: true,
      },
      select: {
        ownerId: true,
      },
    });

    // Also get the contacts I have added as my emergency contacts
    const myContacts = await prisma.trustedContact.findMany({
      where: {
        ownerId: userId,
        status: "ACCEPTED",
        receiveEmergencyAlerts: true,
      },
      select: {
        contactId: true,
      },
    });

    // Union both sets so alerts go to everyone in my emergency network
    const recipientSet = new Set<string>();
    for (const c of contactsWhoTrustMe) {
      recipientSet.add(c.ownerId);
    }
    for (const c of myContacts) {
      recipientSet.add(c.contactId);
    }

    let recipientUserIds: string[] = [];
    for (const recipientId of recipientSet) {
      await prisma.alertRecipient.create({
        data: {
          alertId: alert.id,
          contactId: recipientId,
          status: "PENDING",
          notifiedAt: new Date(),
        },
      });
      recipientUserIds.push(recipientId);
    }


    // Look up Android push tokens for all recipients and send FCM notification
    try {
      if (recipientUserIds.length > 0) {
        const pushTokens = await (prisma as any).pushToken.findMany({
          where: {
            userId: { in: recipientUserIds },
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
          await sendAndroidEmergencyPush(distinctTokens, alert);
        }

      }
    } catch (err) {
      console.error("[alerts/emergency] Failed to send push notifications", err);
    }

    return NextResponse.json({
      success: true,
      alertId: alert.id,
      recipients: contactsWhoTrustMe.map((c) => c.ownerId),
    });
  } catch (error) {
    console.error("Error creating emergency alert:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}