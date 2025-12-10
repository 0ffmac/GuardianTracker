import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
 
   try {
     const body = await request.json() as any;
     const trackingSessionId =
       body.trackingSessionId ||
       body.tracking_session_id ||
       body.sessionId ||
       body.session_id ||
       null;
     const locations = body.locations;
 
     if (!locations || !Array.isArray(locations) || !trackingSessionId) {

      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const locationsData = locations.map((loc: any) => ({
      ...loc,
      userId,
      trackingSessionId,
      source:
        typeof loc.source === "string" &&
        ["gps", "wifi", "hybrid"].includes(loc.source.toLowerCase())
          ? loc.source.toLowerCase()
          : "gps",
    }));

    for (const row of locationsData) {
      await (prisma as any).location.create({ data: row });
    }


    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to sync locations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
