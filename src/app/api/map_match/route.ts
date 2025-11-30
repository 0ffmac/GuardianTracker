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

    // OSRM has a max number of points per /match request.
    // To support long trips, chunk the trace into overlapping
    // windows, call /match on each, and merge the results.
    const MAX_POINTS_PER_MATCH = 90; // keep below server limit (often 100)
    const OVERLAP_POINTS = 2; // keep continuity between chunks

    type GeoCoord = [number, number];

    const mergedGeometry: { type: "LineString"; coordinates: GeoCoord[] } = {
      type: "LineString",
      coordinates: [],
    };

    let confidenceSum = 0;
    let confidenceCount = 0;

    const callOsrmForChunk = async (chunk: any[]) => {
      const coords = chunk.map((p: any) => `${p.lon},${p.lat}`).join(";");
      const timestamps = chunk.map((p: any) => p.timestamp || 0).join(";");

      const url = `${OSRM_URL}/match/v1/driving/${coords}?geometries=geojson&overview=full&timestamps=${timestamps}`;
      const osrmRes = await fetch(url);
      if (!osrmRes.ok) {
        // If a single chunk fails, skip it but keep others.
        return;
      }
      const osrmData = await osrmRes.json();
      if (!osrmData.matchings || osrmData.matchings.length === 0) return;

      for (const matching of osrmData.matchings) {
        if (!matching.geometry || !Array.isArray(matching.geometry.coordinates)) continue;
        for (const coord of matching.geometry.coordinates as GeoCoord[]) {
          const last = mergedGeometry.coordinates[mergedGeometry.coordinates.length - 1];
          if (last && last[0] === coord[0] && last[1] === coord[1]) {
            continue; // avoid duplicate consecutive points
          }
          mergedGeometry.coordinates.push(coord);
        }
        if (typeof matching.confidence === "number") {
          confidenceSum += matching.confidence;
          confidenceCount += 1;
        }
      }
    };

    if (points.length <= MAX_POINTS_PER_MATCH) {
      await callOsrmForChunk(points);
    } else {
      // Sliding window with overlap
      const step = MAX_POINTS_PER_MATCH - OVERLAP_POINTS;
      for (let start = 0; start < points.length; start += step) {
        const end = Math.min(points.length, start + MAX_POINTS_PER_MATCH);
        const chunk = points.slice(start, end);
        if (chunk.length < 2) break;
        // eslint-disable-next-line no-await-in-loop
        await callOsrmForChunk(chunk);
        if (end === points.length) break;
      }
    }

    if (mergedGeometry.coordinates.length === 0) {
      return NextResponse.json({ error: "No match found" }, { status: 404 });
    }

    const avgConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : null;

    return NextResponse.json({
      snapped: mergedGeometry,
      confidence: avgConfidence,
    });
  } catch (e) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
