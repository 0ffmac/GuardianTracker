import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
        console.error("[/api/user/privacy] Invalid mobile token:", e);
      }
    }
  }

  const session = await getServerSession(authOptions);
  if (session?.user && (session.user as any).id) {
    return (session.user as any).id as string;
  }

  return null;
}

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
