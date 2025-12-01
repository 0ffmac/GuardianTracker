// app/mobile-map/page.tsx
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import Map from "@/components/Map";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
interface JwtPayload {
  userId: string;
  deviceId: string;
}
export default async function MobileMapPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;
  if (!token) {
    // No token: show nothing or a simple error
    return <div>Missing token</div>;
  }
  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return <div>Invalid or expired token</div>;
  }
  // Use payload.userId / payload.deviceId to fetch data
  const locations = await prisma.location.findMany({
    where: { deviceId: payload.deviceId },
    orderBy: { timestamp: "asc" },
  });
  // Optionally, currentLocation or snappedGeoJson if you have them
  const currentLocation =
    locations.length > 0 ? locations[locations.length - 1] : null;
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Map
        locations={locations as any} // match your MapProps type
        currentLocation={currentLocation as any}
        fitOnUpdate
        autoZoomOnFirstPoint
        snappedGeoJson={null}
      />
    </div>
  );
}