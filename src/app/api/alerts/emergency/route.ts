import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

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
    // This means other people have added this user as their emergency contact
    const contactsWhoTrustMe = await prisma.trustedContact.findMany({
      where: {
        contactId: userId, // The logged in user is the emergency contact
        status: "ACCEPTED", // Only to accepted contacts
      },
      select: {
        ownerId: true, // The person who added this user as contact
      },
    });

    // Create alert recipients for each trusted contact
    if (contactsWhoTrustMe.length > 0) {
      for (const contact of contactsWhoTrustMe) {
        await prisma.alertRecipient.create({
          data: {
            alertId: alert.id,
            contactId: contact.ownerId, // The person who added this user as contact
            status: "PENDING",
            notifiedAt: new Date(),
          },
        });
      }
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