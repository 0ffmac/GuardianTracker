import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const JWT_SECRET = process.env.NEXTAUTH_SECRET as string | undefined;

    if (!JWT_SECRET) {
      console.error("[/api/alerts/[id]] Missing NEXTAUTH_SECRET");
      return null;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      return decoded.userId;
    } catch (error) {
      console.error("[/api/alerts/[id]] Invalid token", error);
      return null;
    }
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }

  return (session.user as any).id as string;
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alertId = params.id;
    if (!alertId) {
      return NextResponse.json({ error: "Alert id is required" }, { status: 400 });
    }

    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: { alertRecipients: true },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // If the current user created the alert, delete the entire alert
    if (alert.userId === userId) {
      await prisma.alert.delete({ where: { id: alertId } });
      return NextResponse.json({ success: true, scope: "alert" });
    }

    // Otherwise, allow recipients to remove the alert from their own inbox
    const recipient = alert.alertRecipients.find((r) => r.contactId === userId);
    if (!recipient) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.alertRecipient.delete({ where: { id: recipient.id } });
    return NextResponse.json({ success: true, scope: "recipient" });
  } catch (error) {
    console.error("Error deleting alert:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
