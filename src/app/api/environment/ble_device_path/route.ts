import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Bluetooth address is required" },
        { status: 400 },
      );
    }

    const bleScans = await prisma.bleScan.findMany({
      where: {
        address,
        location: {
          userId,
        },
      },
      select: {
        location: {
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
      orderBy: {
        location: {
          timestamp: "asc",
        },
      },
    } as any);

    const locations = bleScans
      .map((scan: any) => scan.location)
      .filter(
        (loc: any) =>
          loc &&
          typeof loc.latitude === "number" &&
          typeof loc.longitude === "number",
      );

    return NextResponse.json({ locations });
  } catch (error) {
    console.error("[ble_device_path] Internal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
