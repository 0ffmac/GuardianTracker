import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const JWT_SECRET = process.env.NEXTAUTH_SECRET as string | undefined;

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
        console.error("[/api/calls/[id]/ice] Invalid mobile token:", e);
      }
    }
  }

  const session = await getServerSession(authOptions);
  if (session?.user && (session.user as any).id) {
    return (session.user as any).id as string;
  }

  return null;
}

// POST: add ICE candidate from current user
// GET: fetch ICE candidates from the other peer
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const callId = params.id;
    const { candidate, sdpMid, sdpMLineIndex } = await request
      .json()
      .catch(() => ({} as any));

    if (!candidate || typeof candidate !== "string") {
      return NextResponse.json({ error: "candidate is required" }, { status: 400 });
    }

    const call = await prisma.callSession.findUnique({ where: { id: callId } });
    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    if (call.callerId !== userId && call.calleeId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rec = await prisma.callIceCandidate.create({
      data: {
        callId,
        fromUserId: userId,
        candidate,
        sdpMid: typeof sdpMid === "string" ? sdpMid : null,
        sdpMLineIndex:
          typeof sdpMLineIndex === "number" ? sdpMLineIndex : null,
      },
    });

    return NextResponse.json({ id: rec.id, createdAt: rec.createdAt });
  } catch (error) {
    console.error("Error storing ICE candidate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const callId = params.id;
    const call = await prisma.callSession.findUnique({ where: { id: callId } });
    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    if (call.callerId !== userId && call.calleeId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const sinceStr = url.searchParams.get("since");
    let since: Date | undefined;
    if (sinceStr) {
      const d = new Date(sinceStr);
      if (!isNaN(d.getTime())) {
        since = d;
      }
    }

    const candidates = await prisma.callIceCandidate.findMany({
      where: {
        callId,
        fromUserId: userId === call.callerId ? call.calleeId : call.callerId,
        ...(since
          ? {
              createdAt: {
                gt: since,
              },
            }
          : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("Error fetching ICE candidates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
