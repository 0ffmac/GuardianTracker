import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const userId = decodedToken.userId;
    const alertId = params.id;
    
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