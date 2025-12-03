import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

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
        contactId: userId
      }
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
        id: alertRecipient.id
      },
      data: {
        status: newStatus,
        respondedAt
      }
    });
    
    return NextResponse.json({
      success: true,
      alertRecipient: updatedAlertRecipient
    });
  } catch (error) {
    console.error("Error responding to alert:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}