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
  try {
    const [locations, devices, trackingSessions] = await Promise.all([
      prisma.location.findMany({
        where: { userId },
        orderBy: { timestamp: "asc" },
        select: { id: true, latitude: true, longitude: true, deviceId: true, timestamp: true },
      }),
      prisma.device.findMany({
        where: { userId },
        orderBy: { lastSeen: "desc" },
      }),
      prisma.trackingSession.findMany({
        where: { userId },
        include: {
          locations: {
            orderBy: { timestamp: "asc" },
            select: { id: true, latitude: true, longitude: true, deviceId: true, timestamp: true },
          },
        },
        orderBy: { startTime: "desc" },
      }),
    ]);
    return NextResponse.json({ locations, devices, trackingSessions });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;
  await prisma.location.deleteMany({ where: { userId } });
  return NextResponse.json({ success: true });
}
