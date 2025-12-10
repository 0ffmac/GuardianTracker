import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

interface AuthContext {
  userId: string | null;
  deviceId: string | null;
}

async function getAuthContextFromRequest(request: Request): Promise<AuthContext> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { userId: null, deviceId: null };
  }

  const token = authHeader.substring(7);
  const JWT_SECRET = process.env.NEXTAUTH_SECRET as string | undefined;

  if (!JWT_SECRET) {
    console.error("[/api/mobile_push/register] Missing NEXTAUTH_SECRET");
    return { userId: null, deviceId: null };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; deviceId: string };
    return { userId: decoded.userId, deviceId: decoded.deviceId };
  } catch (error) {
    console.error("[/api/mobile_push/register] Invalid token", error);
    return { userId: null, deviceId: null };
  }
}

export async function POST(request: Request) {
  try {
    const { userId, deviceId } = await getAuthContextFromRequest(request);

    if (!userId || !deviceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({} as any));
    const token: string | undefined = body.fcmToken || body.token;
    const platform: string = body.platform || "android";

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "fcmToken is required" }, { status: 400 });
    }

    try {
      // Upsert by token so that if FCM rotates tokens we always have a single record per physical token.
      const pushToken = await (prisma as any).pushToken.upsert({
        where: { token },
        update: {
          userId,
          deviceId,
          platform,
        },
        create: {
          userId,
          deviceId,
          token,
          platform,
        },
      });

      return NextResponse.json({
        success: true,
        pushToken: {
          id: pushToken.id,
          platform: pushToken.platform,
        },
      });
    } catch (err: any) {
      // Map foreign key violations (e.g. user was deleted) to a controlled 400
      if (err?.code === "P2003") {
        console.warn(
          "[/api/mobile_push/register] Foreign key error for user/device when saving push token",
          { userId, deviceId }
        );
        return NextResponse.json(
          { error: "Invalid user or device for push token" },
          { status: 400 }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("Error registering mobile push token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
