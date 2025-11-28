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
    let deviceId: string | null = null;
    let mobileToken: string | null = null;

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
        deviceId = decoded.deviceId;
        mobileToken = token;
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
      deviceId = (session.user as any).deviceId || null;
    }

    const { name } = await request.json();

    const trackingSession = await prisma.trackingSession.create({
      data: {
        name,
        startTime: new Date(),
        endTime: new Date(), // This will be updated when the session is stopped
        userId,
      },
    });

    // Optionally, you could update device/mobileSession here using
    // deviceId and mobileToken, similar to update_location.

    return NextResponse.json({ success: true, trackingSession });
  } catch (error) {
    console.error("Failed to start tracking session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
