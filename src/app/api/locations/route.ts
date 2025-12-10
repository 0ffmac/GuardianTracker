// src/app/api/locations/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
export const runtime = "nodejs";
async function getUserIdFromRequest(request: Request): Promise<string | null> {
  // 1) Try mobile JWT from Authorization header
  const authHeader =
    request.headers.get("authorization") ||
    request.headers.get("Authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
          userId: string;
          deviceId?: string;
        };
        return decoded.userId;
      } catch (e) {
        console.error("[/api/locations] Invalid mobile token:", e);
      }
    }
  }
  // 2) Fallback to NextAuth session (web)
  const session = await getServerSession(authOptions);
  if (session && (session.user as any)?.id) {
    return (session.user as any).id as string;
  }
  return null;
}
export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [locations, devices, trackingSessions] = await Promise.all([
      (prisma as any).location.findMany({
        where: { userId },
        orderBy: { timestamp: "asc" },
        select: {
          id: true,
          latitude: true,
          longitude: true,
          deviceId: true,
          timestamp: true,
          source: true,
        },
      }),
      prisma.device.findMany({
        where: { userId },
        orderBy: { lastSeen: "desc" },
      }),
      (prisma as any).trackingSession.findMany({
        where: { userId },
        include: {
          locations: {
            orderBy: { timestamp: "asc" },
            select: {
              id: true,
              latitude: true,
              longitude: true,
              deviceId: true,
              timestamp: true,
              source: true,
            },
          },
        },
        orderBy: { startTime: "desc" },
      }),
    ]);
    return NextResponse.json({ locations, devices, trackingSessions });
  } catch (error) {
    console.error("[/api/locations] Internal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
export async function DELETE(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.location.deleteMany({ where: { userId } });
  return NextResponse.json({ success: true });
}








// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth/next";
// import { authOptions } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";

// export const runtime = "nodejs";

// export async function GET(request: Request) {
//   const session = await getServerSession(authOptions);
//   if (!session || !session.user) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }
//   const userId = (session.user as any).id;
//   try {
//     const [locations, devices, trackingSessions] = await Promise.all([
//       prisma.location.findMany({
//         where: { userId },
//         orderBy: { timestamp: "asc" },
//         select: { id: true, latitude: true, longitude: true, deviceId: true, timestamp: true },
//       }),
//       prisma.device.findMany({
//         where: { userId },
//         orderBy: { lastSeen: "desc" },
//       }),
//       prisma.trackingSession.findMany({
//         where: { userId },
//         include: {
//           locations: {
//             orderBy: { timestamp: "asc" },
//             select: { id: true, latitude: true, longitude: true, deviceId: true, timestamp: true },
//           },
//         },
//         orderBy: { startTime: "desc" },
//       }),
//     ]);
//     return NextResponse.json({ locations, devices, trackingSessions });
//   } catch (error) {
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }

// export async function DELETE(request: Request) {
//   const session = await getServerSession(authOptions);
//   if (!session || !session.user) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }
//   const userId = (session.user as any).id;
//   await prisma.location.deleteMany({ where: { userId } });
//   return NextResponse.json({ success: true });
// }
