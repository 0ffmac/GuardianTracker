import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { shareLocationWithTrustedContacts: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    shareLocationWithTrustedContacts: user.shareLocationWithTrustedContacts,
  });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const body = await request.json().catch(() => ({} as any));
  const value = body.shareLocationWithTrustedContacts;

  if (typeof value !== "boolean") {
    return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { shareLocationWithTrustedContacts: value },
    select: { shareLocationWithTrustedContacts: true },
  });

  return NextResponse.json({
    shareLocationWithTrustedContacts: updated.shareLocationWithTrustedContacts,
  });
}
