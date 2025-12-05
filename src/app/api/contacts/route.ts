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
        console.error("[/api/contacts] Invalid mobile token:", e);
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

  const contacts = await prisma.trustedContact.findMany({
    where: { ownerId: userId },
    include: {
      contact: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const trustedBy = await prisma.trustedContact.findMany({
    where: { contactId: userId },
    include: {
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ contacts, trustedBy });
}

export async function POST(request: Request) {
  const ownerId = await getUserIdFromRequest(request);
  if (!ownerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await request.json().catch(() => ({} as any));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const contactUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!contactUser) {
    return NextResponse.json(
      { error: "No user with this email exists" },
      { status: 400 }
    );
  }

  if (contactUser.id === ownerId) {
    return NextResponse.json(
      { error: "You cannot add yourself as a contact" },
      { status: 400 }
    );
  }

  const existing = await prisma.trustedContact.findUnique({
    where: {
      ownerId_contactId: {
        ownerId,
        contactId: contactUser.id,
      },
    },
  });

  if (existing) {
    // If they previously declined, turning it back to PENDING lets you "re-invite".
    if (existing.status === "DECLINED") {
      const updated = await prisma.trustedContact.update({
        where: { id: existing.id },
        data: { status: "PENDING" },
        include: {
          contact: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });
      return NextResponse.json({ contact: updated }, { status: 200 });
    }

    return NextResponse.json(
      { error: "This user is already a trusted contact" },
      { status: 400 }
    );
  }

  const contact = await prisma.trustedContact.create({
    data: {
      ownerId,
      contactId: contactUser.id,
      status: "PENDING",
    },
    include: {
      contact: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  return NextResponse.json({ contact }, { status: 201 });
}
