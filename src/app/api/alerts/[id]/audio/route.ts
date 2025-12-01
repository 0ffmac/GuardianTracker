import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

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

      // In a real implementation, you would upload to a cloud storage service
      // For now, we'll simulate by creating a placeholder URL
      const contentUrl = `/api/audio/${audioFile.name}`; // Placeholder URL
      const contentType = formData.get('contentType') as string || audioFile.type || "audio/webm";
      const durationStr = formData.get('duration') as string;
      const duration = durationStr ? parseFloat(durationStr) : undefined;

      // Create the audio message
      audioMessage = await prisma.audioMessage.create({
        data: {
          alertId,
          senderId: userId,
          receiverId: receiverId || undefined, // Optional - can be null for broadcast
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

      // Create the audio message
      audioMessage = await prisma.audioMessage.create({
        data: {
          alertId,
          senderId: userId,
          receiverId: receiverId || undefined, // Optional - can be null for broadcast
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

    return NextResponse.json({
      success: true,
      audioMessage
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