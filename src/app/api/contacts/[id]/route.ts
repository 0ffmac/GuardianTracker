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

  const { status } = await request.json().catch(() => ({} as any));
  if (!status || (status !== "ACCEPTED" && status !== "DECLINED")) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Only the contact themselves can accept/decline being an emergency contact.
  const record = await prisma.trustedContact.findUnique({ where: { id: trustedContactId } });
  if (!record || record.contactId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.trustedContact.update({
    where: { id: trustedContactId },
    data: { status },
  });

  return NextResponse.json({ contact: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ownerId = userId;
  const trustedContactId = params.id;

  await prisma.trustedContact.deleteMany({
    where: { id: trustedContactId, ownerId },
  });

  return NextResponse.json({ success: true });
}
