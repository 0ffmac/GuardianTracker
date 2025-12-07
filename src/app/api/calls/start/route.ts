import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const JWT_SECRET = process.env.NEXTAUTH_SECRET as string | undefined;

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authHeader =
    request.headers.get("authorization") ??
    request.headers.get("Authorization");

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice("bearer ".length).trim();
    if (token && JWT_SECRET) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as {
          userId?: string;
          sub?: string;
          id?: string;
        };
        const userId = payload.userId ?? payload.sub ?? payload.id;
        if (typeof userId === "string" && userId.length > 0) {
          return userId;
        }
      } catch (e) {
        console.error("[/api/calls/start] Invalid mobile token:", e);
      }
    }
  }

  const session = await getServerSession(authOptions);
  if (session?.user && (session.user as any).id) {
    return (session.user as any).id as string;
  }

  return null;
}

// Start a new WebRTC call between authenticated user (caller) and calleeId
export async function POST(request: Request) {
  try {
    const callerId = await getUserIdFromRequest(request);
    if (!callerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { calleeId, offerSdp } = await request.json().catch(() => ({} as any));

    if (!calleeId || typeof calleeId !== "string") {
      return NextResponse.json({ error: "calleeId is required" }, { status: 400 });
    }

    if (!offerSdp || typeof offerSdp !== "string") {
      return NextResponse.json({ error: "offerSdp is required" }, { status: 400 });
    }

    if (calleeId === callerId) {
      return NextResponse.json({ error: "Cannot call yourself" }, { status: 400 });
    }

    // Ensure callee exists
    const callee = await prisma.user.findUnique({ where: { id: calleeId } });
    if (!callee) {
      return NextResponse.json({ error: "Callee not found" }, { status: 404 });
    }

    // Optional guard: require a trusted contact relationship where caller allows calls/messages
    const rel = await prisma.trustedContact.findFirst({
      where: {
        ownerId: callerId,
        contactId: calleeId,
        status: "ACCEPTED",
        allowCallsAndMessages: true,
      },
    });

    if (!rel) {
      return NextResponse.json(
        { error: "Calls are not enabled for this contact" },
        { status: 403 }
      );
    }

    const call = await prisma.callSession.create({
      data: {
        callerId,
        calleeId,
        status: "RINGING",
        offerSdp,
      },
    });

    // Fire-and-forget push notification to callee using FCM v1 if configured
    (async () => {
      try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !rawPrivateKey) {
          return;
        }

        const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

        const tokens = await (prisma as any).pushToken.findMany({
          where: { userId: calleeId },
          select: { token: true, platform: true },
        });

        if (!tokens.length) {
          return;
        }

        const caller = await prisma.user.findUnique({
          where: { id: callerId },
          select: { name: true, email: true },
        });

        const title = caller?.name || caller?.email || "Incoming Guardian call";

        // Build JWT for OAuth2 token
        const now = Math.floor(Date.now() / 1000);
        const tokenPayload = {
          iss: clientEmail,
          aud: "https://oauth2.googleapis.com/token",
          scope: "https://www.googleapis.com/auth/firebase.messaging",
          iat: now,
          exp: now + 3600,
        };

        const assertion = jwt.sign(tokenPayload, privateKey, {
          algorithm: "RS256",
        });

        const oauthRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion,
          }),
        });

        if (!oauthRes.ok) {
          console.error("[/api/calls/start] Failed to obtain FCM access token", await oauthRes.text());
          return;
        }

        const oauthJson = (await oauthRes.json()) as any;
        const accessToken = oauthJson.access_token as string | undefined;

        if (!accessToken) {
          console.error("[/api/calls/start] No access_token in FCM OAuth response");
          return;
        }

        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

        for (const t of tokens as any[]) {
          const message = {
            message: {
              token: t.token,
              // Data-only message so the app/CallKit controls UI and ringtone
              data: {
                type: "incoming_call",
                callId: call.id,
                callerId,
                calleeId,
                offerSdp,
                callerName: caller?.name || "",
              },
            },
          };

          await fetch(fcmUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(message),
          });
        }
      } catch (pushError) {
        console.error("[/api/calls/start] Error sending incoming-call push (v1):", pushError);
      }
    })();

    return NextResponse.json({
      callId: call.id,
      status: call.status,
      createdAt: call.createdAt,
    });
  } catch (error) {
    console.error("Error starting call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
