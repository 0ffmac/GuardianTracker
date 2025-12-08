import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const JWT_SECRET = process.env.NEXTAUTH_SECRET as string;

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authHeader =
    request.headers.get("authorization") ??
    request.headers.get("Authorization");

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice("bearer ".length).trim();
    if (token && JWT_SECRET) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as {
          userId?: string;
          sub?: string;
          id?: string;
        };
        const userId = payload.userId ?? payload.sub ?? payload.id;
        if (typeof userId === "string" && userId.length > 0) {
          return userId;
        }
      } catch (e) {
        console.error("[/api/contacts/[id]] Invalid mobile token:", e);
      }
    }
  }

  const session = await getServerSession(authOptions);
  if (session?.user && (session.user as any).id) {
    return (session.user as any).id as string;
  }

  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const trustedContactId = params.id;

  const body = await request.json().catch(() => ({} as any));
  const { status, receiveEmergencyAlerts, allowCallsAndMessages } = body;

  const record = await prisma.trustedContact.findUnique({ where: { id: trustedContactId } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isContact = record.contactId === userId;
  const isOwner = record.ownerId === userId;

  // Contact can ACCEPT/DECLINE being a trusted contact
  if (status !== undefined) {
    if (!isContact) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (status !== "ACCEPTED" && status !== "DECLINED") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.trustedContact.update({
      where: { id: trustedContactId },
      data: { status },
    });

    return NextResponse.json({ contact: updated });
  }

  // Owner can toggle emergency alerts vs calls/messages settings
  const hasFlagUpdate =
    typeof receiveEmergencyAlerts === "boolean" ||
    typeof allowCallsAndMessages === "boolean";

  if (hasFlagUpdate) {
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data: any = {};
    if (typeof receiveEmergencyAlerts === "boolean") {
      data.receiveEmergencyAlerts = receiveEmergencyAlerts;
    }
    if (typeof allowCallsAndMessages === "boolean") {
      data.allowCallsAndMessages = allowCallsAndMessages;
    }

    const updated = await prisma.trustedContact.update({
      where: { id: trustedContactId },
      data,
    });

    return NextResponse.json({ contact: updated });
  }

  return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const trustedContactId = params.id;

  await prisma.trustedContact.deleteMany({
    where: {
      id: trustedContactId,
      OR: [{ ownerId: userId }, { contactId: userId }],
    },
  });

  return NextResponse.json({ success: true });
}
