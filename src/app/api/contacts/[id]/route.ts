import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ownerId = (session.user as any).id as string;
  const trustedContactId = params.id;

  await prisma.trustedContact.deleteMany({
    where: { id: trustedContactId, ownerId },
  });

  return NextResponse.json({ success: true });
}