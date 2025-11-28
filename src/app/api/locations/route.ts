import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  console.log(`[location_history] Fetching tracking sessions for userId: ${userId}`);

  try {
    const [locations, devices, trackingSessions] = await Promise.all([
      prisma.location.findMany({
        where: {
          userId: userId,
        },
        orderBy: {
          timestamp: "asc",
        },
        select: {
          id: true,
          latitude: true,
          longitude: true,
          deviceId: true,
          timestamp: true,
        },
      }),
      prisma.device.findMany({
        where: {
          userId: userId,
        },
        orderBy: {
          lastSeen: "desc",
        },
      }),
      prisma.trackingSession.findMany({
        where: {
          userId: userId,
        },
        include: {
          locations: {
            orderBy: {
              timestamp: "asc",
            },
            select: {
              id: true,
              latitude: true,
              longitude: true,
              deviceId: true,
              timestamp: true,
            },
          },
        },
        orderBy: {
          startTime: "desc",
        },
      }),
    ]);

    console.log(
      `[locations] Returning ${locations.length} locations, ${devices.length} devices and ${trackingSessions.length} sessions for userId: ${userId}`
    );

    return NextResponse.json({ locations, devices, trackingSessions });
  } catch (error) {
    console.error("Failed to fetch location history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
