import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = (session.user as any).id as string;
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