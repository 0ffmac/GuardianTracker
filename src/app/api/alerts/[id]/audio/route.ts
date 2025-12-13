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

  return accessToken;
}

async function sendAndroidAlertAudioPush(
  tokens: string[],
  payload: {
    alertId: string;
    senderId: string;
    senderName: string;
    title: string;
  }
) {
  if (!tokens.length) return;

  const accessToken = await getFcmAccessToken();
  const url = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;

  const { alertId, senderId, senderName, title } = payload;
  const notificationTitle = `New audio message from ${senderName}`;
  const body = title || "Tap to listen to the message";

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
              title: notificationTitle,
              body,
            },
            data: {
              type: "EMERGENCY_ALERT",
              event: "AUDIO_MESSAGE",
              alertId,
              fromUserId: senderId,
              fromUserName: senderName,
            },
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "<no body>");
        console.error("[alerts/[id]/audio] FCM v1 send failed", res.status, text);
      }
    } catch (err) {
      console.error("[alerts/[id]/audio] Error sending FCM v1 push", err);
    }
  }
}

// Handle audio message uploads for a specific alert
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

    // Verify that the alert exists and that the user has permission to add audio to it
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        alertRecipients: {
          select: {
            contactId: true,
          },
        },
      },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // Check if user is either the alert creator or a recipient
    const isCreator = alert.userId === userId;
    const isRecipient = await prisma.alertRecipient.findFirst({
      where: {
        alertId,
        contactId: userId
      }
    });

    if (!isCreator && !isRecipient) {
      return NextResponse.json({ error: "Unauthorized to add audio to this alert" }, { status: 403 });
    }
    
        const contentTypeHeader = request.headers.get('Content-Type');

    let audioMessage;

    if (contentTypeHeader?.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const audioFile = formData.get('audioFile') as File | null;
      const receiverId = formData.get('receiverId') as string | null;
      const messageType = formData.get('messageType') as string | null;

      if (!audioFile) {
        return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
      }

      // Persist the uploaded audio file to disk so it can be played back
      const uploadDir = path.join(process.cwd(), "public", "audio");
      await fs.mkdir(uploadDir, { recursive: true });

      const extension = audioFile.type === "audio/mpeg" ? ".mp3" : ".webm";
      const fileName = `${alertId}-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
      const filePath = path.join(uploadDir, fileName);

      const arrayBuffer = await audioFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(filePath, buffer);

      const contentUrl = `/api/audio/${fileName}`;
      const contentType = (formData.get('contentType') as string) || audioFile.type || "audio/webm";
      const durationStr = formData.get('duration') as string;
      const duration = durationStr ? parseFloat(durationStr) : undefined;

      // Determine the appropriate receiver for this audio message
      // If the sender is the alert creator, the audio should go to recipients
      // If the sender is a recipient, the audio should go back to the creator
      const intendedReceiverId = isCreator
        ? null  // Broadcast to all recipients or specific recipient if receiverId provided
        : alert.userId; // Send response back to the alert creator

      // Create the audio message
      audioMessage = await prisma.audioMessage.create({
        data: {
          alertId,
          senderId: userId,
          receiverId: receiverId || intendedReceiverId, // Allow specific receiver or use default logic
          contentUrl,
          contentType: contentType,
          duration: duration || undefined,
          status: "SENT",
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      });
    } else {
      // Handle JSON request
      const { contentUrl, contentType, duration, receiverId } = await request.json();

      if (!contentUrl) {
        return NextResponse.json({ error: "Audio content URL is required" }, { status: 400 });
      }

      // Determine the appropriate receiver for this audio message
      // If the sender is the alert creator, the audio should go to recipients
      // If the sender is a recipient, the audio should go back to the creator
      const intendedReceiverId = isCreator
        ? null  // Broadcast to all recipients or specific recipient if receiverId provided
        : alert.userId; // Send response back to the alert creator

      // Create the audio message
      audioMessage = await prisma.audioMessage.create({
        data: {
          alertId,
          senderId: userId,
          receiverId: receiverId || intendedReceiverId, // Allow specific receiver or use default logic
          contentUrl,
          contentType: contentType || "audio/webm",
          duration: duration || undefined,
          status: "SENT",
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      });
    }

    // After saving the audio message, notify intended recipients via push
    try {
      const message: any = audioMessage;
      const alertWithRecipients: any = alert;

      if (message && alertWithRecipients) {
        const senderId: string = message.senderId;
        const senderName: string =
          message.sender?.name || message.sender?.email || "Emergency contact";

        let targetUserIds: string[] = [];

        if (message.receiverId) {
          // Direct message to a single user
          targetUserIds = [message.receiverId as string];
        } else if (isCreator) {
          // Broadcast from alert creator to all recipients
          const recipients =
            (alertWithRecipients.alertRecipients || []) as { contactId: string }[];
          targetUserIds = recipients.map((r) => r.contactId);
        }

        // Avoid notifying the sender themself
        targetUserIds = targetUserIds.filter((id) => id && id !== senderId);

        if (targetUserIds.length > 0) {
          const pushTokens = await (prisma as any).pushToken.findMany({
            where: {
              userId: { in: targetUserIds },
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
            const alertTitle: string =
              alertWithRecipients.title || "Emergency Alert";

            await sendAndroidAlertAudioPush(distinctTokens, {
              alertId,
              senderId,
              senderName,
              title: alertTitle,
            });
          }
        }
      }
    } catch (err) {
      console.error(
        "[alerts/[id]/audio] Failed to send audio push notifications",
        err
      );
    }

    return NextResponse.json({
      success: true,
      audioMessage,
    });

  } catch (error) {
    console.error("Error creating audio message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get all audio messages for a specific alert
export async function GET(request: Request, { params }: { params: { id: string } }) {
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
    
    // Verify that the alert exists and that the user has permission to view it
    const alert = await prisma.alert.findUnique({
      where: { id: alertId }
    });
    
    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    
    // Check if user is either the alert creator or a recipient
    const isCreator = alert.userId === userId;
    const isRecipient = await prisma.alertRecipient.findFirst({
      where: {
        alertId,
        contactId: userId
      }
    });
    
    if (!isCreator && !isRecipient) {
      return NextResponse.json({ error: "Unauthorized to view audio messages for this alert" }, { status: 403 });
    }
    
    const audioMessages = await prisma.audioMessage.findMany({
      where: {
        alertId,
        OR: [
          { receiverId: null }, // Broadcast messages
          { receiverId: userId }, // Messages specifically for this user
          { senderId: userId } // Messages sent by this user
        ]
      },
      include: {
        sender: {
          select: { 
            id: true, 
            name: true, 
            email: true,
            image: true
          }
        },
        receiver: {
          select: { 
            id: true, 
            name: true, 
            email: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });
    
    return NextResponse.json({
      audioMessages
    });
  } catch (error) {
    console.error("Error fetching audio messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}