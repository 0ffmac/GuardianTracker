import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    let userId = "";

    // Try mobile JWT auth first (for mobile app)
    const authorization =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");
    const token = authorization?.split(" ")[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
          userId: string;
          deviceId: string;
        };
        userId = decoded.userId;
      } catch (error) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    } else {
      // Fallback to NextAuth session (for web clients)
      const session = await getServerSession(authOptions);

      if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      userId = (session.user as any).id;
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const updatedSession = await prisma.trackingSession.update({
      where: {
        id: sessionId,
        userId,
      },
      data: {
        endTime: new Date(),
      },
    });

    return NextResponse.json({ success: true, updatedSession });
  } catch (error) {
    console.error("Failed to stop tracking session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
