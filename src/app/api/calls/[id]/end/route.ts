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
        console.error("[/api/calls/[id]/end] Invalid mobile token:", e);
      }
    }
  }

  const session = await getServerSession(authOptions);
  if (session?.user && (session.user as any).id) {
    return (session.user as any).id as string;
  }

  return null;
}

// Mark a call as ended by either participant
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

    const call = await prisma.callSession.findUnique({ where: { id: callId } });
    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Only caller or callee may end the call
    if (call.callerId !== userId && call.calleeId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const terminalStatuses = ["ENDED", "DECLINED", "MISSED"];
    if (terminalStatuses.includes(call.status)) {
      // Idempotent: if already ended/declined/missed, just return current state
      return NextResponse.json({
        callId: call.id,
        status: call.status,
      });
    }

    const updated = await prisma.callSession.update({
      where: { id: callId },
      data: { status: "ENDED" },
    });

    return NextResponse.json({
      callId: updated.id,
      status: updated.status,
    });
  } catch (error) {
    console.error("Error ending call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
