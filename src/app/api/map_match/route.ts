import { NextResponse } from "next/server";

// const OSRM_URL = process.env.OSRM_URL || "http://localhost:5000";
const OSRM_URL = process.env.OSRM_URL || "https://9cdd8c44328a.ngrok-free.app";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { points } = await request.json();
    if (!Array.isArray(points) || points.length < 2) {
      return NextResponse.json({ error: "At least 2 points required" }, { status: 400 });
    }

    // Build OSRM match query
    const coords = points.map((p: any) => `${p.lon},${p.lat}`).join(";");
    const timestamps = points.map((p: any) => p.timestamp || 0).join(";");

    const url = `${OSRM_URL}/match/v1/driving/${coords}?geometries=geojson&timestamps=${timestamps}`;

    const osrmRes = await fetch(url);
    if (!osrmRes.ok) {
      return NextResponse.json({ error: "OSRM error" }, { status: 500 });
    }
    const osrmData = await osrmRes.json();

    // Return the snapped geometry (polyline)
    if (osrmData.matchings && osrmData.matchings.length > 0) {
      return NextResponse.json({
        snapped: osrmData.matchings[0].geometry,
        confidence: osrmData.matchings[0].confidence,
      });
    } else {
      return NextResponse.json({ error: "No match found" }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
