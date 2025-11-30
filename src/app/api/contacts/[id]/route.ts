import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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
