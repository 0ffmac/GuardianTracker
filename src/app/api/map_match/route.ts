import { NextResponse } from "next/server";

// const OSRM_URL = process.env.OSRM_URL || "http://localhost:5000";
const OSRM_URL = process.env.OSRM_URL;

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { points } = await request.json();
    if (!Array.isArray(points) || points.length < 2) {
      return NextResponse.json({ error: "At least 2 points required" }, { status: 400 });
    }
 
    // 1) Clean obvious GPS glitches using a speed threshold.
    const MAX_SPEED_KMH = 250; // discard teleports faster than this
 
    const toRad = (v: number) => (v * Math.PI) / 180;
    const haversineMeters = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ) => {
      const R = 6371000; // meters
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };
 
    // Before speed-based cleaning, collapse long "stay" clusters (e.g. restaurant/home)
    const DWELL_RADIUS_METERS = 20; // points within this radius considered same place
    const MIN_DWELL_SECONDS = 90;   // must stay at least this long to collapse
    const MIN_DWELL_POINTS = 5;     // require enough samples to treat as a dwell
    const MOVEMENT_WITHIN_DWELL_METERS = 10; // if you roam more than this inside, keep a mid point
 
    const collapseDwellClusters = (pts: any[]) => {
      if (pts.length === 0) return [] as any[];
      const result: any[] = [];
 
      let cluster: {
        points: any[];
        centerLat: number;
        centerLon: number;
        maxDist: number;
        maxDistPoint: any | null;
      } | null = null;
 
      const flushCluster = () => {
        if (!cluster) return;
        const first = cluster.points[0];
        const last = cluster.points[cluster.points.length - 1];
        const dwellSeconds = (last.timestamp || 0) - (first.timestamp || 0);
 
        if (
          dwellSeconds >= MIN_DWELL_SECONDS &&
          cluster.points.length >= MIN_DWELL_POINTS
        ) {
          const mid = cluster.maxDistPoint;
          if (mid && cluster.maxDist >= MOVEMENT_WITHIN_DWELL_METERS) {
            // Long dwell with noticeable internal movement: entry -> mid move -> exit
            result.push(first, mid, last);
          } else {
            // Mostly static dwell: just entry -> exit
            result.push(first, last);
          }
        } else {
          // Short or sparse: keep all raw points
          result.push(...cluster.points);
        }
        cluster = null;
      };
 
      for (const p of pts) {
        if (
          typeof p.lat !== "number" ||
          typeof p.lon !== "number" ||
          typeof p.timestamp !== "number"
        ) {
          // Non-usable point, just flush current cluster and skip
          flushCluster();
          continue;
        }
 
        if (!cluster) {
          cluster = {
            points: [p],
            centerLat: p.lat,
            centerLon: p.lon,
            maxDist: 0,
            maxDistPoint: null,
          };
          continue;
        }
 
        const dist = haversineMeters(
          cluster.centerLat,
          cluster.centerLon,
          p.lat,
          p.lon
        );
 
        if (dist <= DWELL_RADIUS_METERS) {
          // Still in same place: grow cluster and update center slightly
          cluster.points.push(p);
          const n = cluster.points.length;
          cluster.centerLat =
            cluster.centerLat + (p.lat - cluster.centerLat) / n;
          cluster.centerLon =
            cluster.centerLon + (p.lon - cluster.centerLon) / n;
 
          if (dist > cluster.maxDist) {
            cluster.maxDist = dist;
            cluster.maxDistPoint = p;
          }
        } else {
          // Moved away: finalize previous cluster and start a new one
          flushCluster();
          cluster = {
            points: [p],
            centerLat: p.lat,
            centerLon: p.lon,
            maxDist: 0,
            maxDistPoint: null,
          };
        }
      }
 
      flushCluster();
      return result;
    };
 
    const cleanedPoints: any[] = [];
    // Sort by timestamp in case they arrived unordered
    const sortedPoints = [...points].sort(
      (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
    );
 
    // First, collapse any long dwell clusters to reduce jitter
    const dwellReduced = collapseDwellClusters(sortedPoints);
    if (dwellReduced.length === 0) {
      return NextResponse.json({ error: "Not enough valid points after dwell clustering" }, { status: 400 });
    }
 
    cleanedPoints.push(dwellReduced[0]);
    for (let i = 1; i < dwellReduced.length; i++) {
      const prev = cleanedPoints[cleanedPoints.length - 1];
      const curr = dwellReduced[i];


      // Skip if coordinates missing
      if (typeof curr.lat !== "number" || typeof curr.lon !== "number") continue;
      if (typeof prev.lat !== "number" || typeof prev.lon !== "number") continue;

      const tPrev = prev.timestamp || 0;
      const tCurr = curr.timestamp || 0;
      const dt = tCurr - tPrev;
      if (dt <= 0) {
        // No forward time movement: drop curr
        continue;
      }

      const dist = haversineMeters(prev.lat, prev.lon, curr.lat, curr.lon);
      const speedKmh = (dist / 1000) / (dt / 3600);

      if (speedKmh > MAX_SPEED_KMH) {
        // Implausible jump: treat as glitch and skip this point
        continue;
      }

      cleanedPoints.push(curr);
    }

    if (cleanedPoints.length < 2) {
      return NextResponse.json({ error: "Not enough valid points after cleaning" }, { status: 400 });
    }

    // 2) OSRM has a max number of points per /match request.
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

    if (cleanedPoints.length <= MAX_POINTS_PER_MATCH) {
      await callOsrmForChunk(cleanedPoints);
    } else {
      // Sliding window with overlap
      const step = MAX_POINTS_PER_MATCH - OVERLAP_POINTS;
      for (let start = 0; start < cleanedPoints.length; start += step) {
        const end = Math.min(cleanedPoints.length, start + MAX_POINTS_PER_MATCH);
        const chunk = cleanedPoints.slice(start, end);
        if (chunk.length < 2) break;
        // eslint-disable-next-line no-await-in-loop
        await callOsrmForChunk(chunk);
        if (end === cleanedPoints.length) break;
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
