import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Haversine helper
const toRad = (v: number) => (v * Math.PI) / 180;
const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authHeader =
    request.headers.get("authorization") ||
    request.headers.get("Authorization");

  // Mobile JWT
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
        console.error("[/api/contacts/nearby] Invalid mobile token:", e);
      }
    }
  }

  // Web cookie session
  const session = await getServerSession(authOptions);
  if (session && (session.user as any)?.id) {
    return (session.user as any).id;
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const radiusKm = Math.max(
      0.5,
      Number(url.searchParams.get("radiusKm") ?? 5)
    );

    // Check privacy setting
    const privacyUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { shareLocationWithTrustedContacts: true },
    });

    if (!privacyUser?.shareLocationWithTrustedContacts) {
      return NextResponse.json(
        { contacts: [], radiusKm, sharingEnabled: false },
        { status: 200 }
      );
    }

    // Get own latest location
    const selfLocation = await prisma.location.findFirst({
      where: { userId },
      orderBy: { timestamp: "desc" },
    });

    if (!selfLocation) {
      return NextResponse.json(
        { contacts: [], radiusKm, sharingEnabled: true },
        { status: 200 }
      );
    }

    // Fetch trusted relationships
    const relations = await prisma.trustedContact.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ ownerId: userId }, { contactId: userId }],
      },
      include: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        contact: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    const otherUserIds = new Set<string>();
    const contactMeta: Record<
      string,
      { id: string; name: string | null; email: string; image: string | null }
    > = {};

    for (const rel of relations) {
      const other = rel.ownerId === userId ? rel.contact : rel.owner;
      if (!other) continue;
      otherUserIds.add(other.id);
      contactMeta[other.id] = {
        id: other.id,
        name: other.name ?? null,
        email: other.email,
        image: other.image ?? null,
      };
    }

    if (otherUserIds.size === 0) {
      return NextResponse.json({ contacts: [], radiusKm }, { status: 200 });
    }

    // Compute distances
    const results = [];
    for (const otherId of otherUserIds) {
      const lastLoc = await prisma.location.findFirst({
        where: { userId: otherId },
        orderBy: { timestamp: "desc" },
      });

      if (!lastLoc) continue;

      const distanceKm = haversineKm(
        selfLocation.latitude,
        selfLocation.longitude,
        lastLoc.latitude,
        lastLoc.longitude
      );

      if (distanceKm <= radiusKm) {
        const meta = contactMeta[otherId];
        results.push({
          userId: meta.id,
          name: meta.name,
          email: meta.email,
          image: meta.image,
          distanceKm,
          lastLocation: {
            latitude: lastLoc.latitude,
            longitude: lastLoc.longitude,
            timestamp: lastLoc.timestamp,
          },
        });
      }
    }

    results.sort((a, b) => a.distanceKm - b.distanceKm);

    return NextResponse.json(
      { contacts: results, radiusKm, sharingEnabled: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Nearby contacts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}










// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth/next";
// import { authOptions } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// const toRad = (v: number) => (v * Math.PI) / 180;

// const haversineKm = (
//   lat1: number,
//   lon1: number,
//   lat2: number,
//   lon2: number
// ) => {
//   const R = 6371; // km
//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lon2 - lon1);
//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(toRad(lat1)) *
//       Math.cos(toRad(lat2)) *
//       Math.sin(dLon / 2) *
//       Math.sin(dLon / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// };

// export async function GET(request: Request) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }
//     const userId = (session.user as any).id as string;

//     const url = new URL(request.url);
//     const radiusStr = url.searchParams.get("radiusKm");
//     const radiusKm = radiusStr ? Math.max(0.5, Number(radiusStr)) : 5; // default 5 km

//     // Respect user privacy setting: if disabled, never reveal nearby contacts
//     const privacyUser = await prisma.user.findUnique({
//       where: { id: userId },
//       select: { shareLocationWithTrustedContacts: true },
//     });

//     if (!privacyUser || !privacyUser.shareLocationWithTrustedContacts) {
//       return NextResponse.json({ contacts: [], radiusKm, sharingEnabled: false }, { status: 200 });
//     }

//     // Current user's latest location
//     const selfLocation = await prisma.location.findFirst({
//       where: { userId },
//       orderBy: { timestamp: "desc" },
//     });

//     if (!selfLocation) {
//       return NextResponse.json({ contacts: [], radiusKm, sharingEnabled: true }, { status: 200 });
//     }

//     // Trusted relationships where this user is either owner or contact, and accepted
//     const relations = await prisma.trustedContact.findMany({
//       where: {
//         status: "ACCEPTED",
//         OR: [{ ownerId: userId }, { contactId: userId }],
//       },
//       include: {
//         owner: { select: { id: true, name: true, email: true, image: true } },
//         contact: { select: { id: true, name: true, email: true, image: true } },
//       },
//     });

//     const otherUserIds = new Set<string>();
//     const contactMeta: Record<string, { id: string; name: string | null; email: string; image: string | null }> = {};

//     for (const rel of relations) {
//       const other = rel.ownerId === userId ? rel.contact : rel.owner;
//       if (!other) continue;
//       otherUserIds.add(other.id);
//       contactMeta[other.id] = {
//         id: other.id,
//         name: other.name ?? null,
//         email: other.email,
//         image: other.image ?? null,
//       };
//     }

//     if (otherUserIds.size === 0) {
//       return NextResponse.json({ contacts: [], radiusKm }, { status: 200 });
//     }

//     // For each contact, fetch their latest location and compute distance
//     const results: any[] = [];
//     for (const otherId of otherUserIds) {
//       const lastLoc = await prisma.location.findFirst({
//         where: { userId: otherId },
//         orderBy: { timestamp: "desc" },
//       });
//       if (!lastLoc) continue;

//       const distanceKm = haversineKm(
//         selfLocation.latitude,
//         selfLocation.longitude,
//         lastLoc.latitude,
//         lastLoc.longitude
//       );

//       if (distanceKm <= radiusKm) {
//         const meta = contactMeta[otherId];
//         results.push({
//           userId: meta.id,
//           name: meta.name,
//           email: meta.email,
//           image: meta.image,
//           distanceKm,
//           lastLocation: {
//             latitude: lastLoc.latitude,
//             longitude: lastLoc.longitude,
//             timestamp: lastLoc.timestamp,
//           },
//         });
//       }
//     }

//     results.sort((a, b) => a.distanceKm - b.distanceKm);

//     return NextResponse.json({ contacts: results, radiusKm, sharingEnabled: true }, { status: 200 });
//   } catch (error) {
//     console.error("Nearby contacts error:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }
