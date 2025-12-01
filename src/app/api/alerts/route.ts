import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    let userId: string;

    // Check if this is a mobile request (with Bearer token) or web request (with session)
    const authHeader = request.headers.get('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Mobile request with JWT token
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const JWT_SECRET = process.env.NEXTAUTH_SECRET as string;

      if (!JWT_SECRET) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }

      // Verify the JWT token
      let decodedToken: any;
      try {
        decodedToken = jwt.verify(token, JWT_SECRET) as { userId: string; deviceId: string };
      } catch (error) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }

      userId = decodedToken.userId;
    } else {
      // Web request with NextAuth session
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      userId = (session.user as any).id as string;
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ACTIVE";
    const type = searchParams.get("type"); // "sent" or "received"
    
    let alerts;
    
    if (type === "sent") {
      // Get alerts created by this user
      alerts = await prisma.alert.findMany({
        where: {
          userId: userId,
          status: status,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          audioMessages: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            },
            orderBy: { createdAt: "asc" }
          },
          alertRecipients: {
            include: {
              contact: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Get alerts received by this user (as a recipient)
      alerts = await prisma.alert.findMany({
        where: {
          alertRecipients: {
            some: {
              contactId: userId,
              status: {
                in: status === "ALL" ? undefined : [status, "PENDING", "READ", "RESPONDED"]
              }
            }
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          audioMessages: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            },
            orderBy: { createdAt: "asc" }
          },
          alertRecipients: {
            where: {
              contactId: userId
            },
            select: {
              status: true,
              createdAt: true,
              notifiedAt: true,
              respondedAt: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({
      alerts: alerts.map((alert: any) => {
        if (type === "sent") {
          const recipients = (alert.alertRecipients || []).map((ar: any) => ({
            id: ar.contactId,
            name: ar.contact?.name ?? null,
            email: ar.contact?.email ?? "",
            image: ar.contact?.image ?? null,
            status: ar.status,
            notifiedAt: ar.notifiedAt,
            respondedAt: ar.respondedAt,
          }));

          return {
            ...alert,
            recipients,
            recipientStatus: null,
            recipientNotifiedAt: null,
            recipientRespondedAt: null,
          };
        }

        // Received alerts: keep existing single-recipient convenience fields
        if ("alertRecipients" in alert && alert.alertRecipients && alert.alertRecipients.length > 0) {
          const recipient = alert.alertRecipients[0];
          return {
            ...alert,
            recipientStatus: recipient?.status || null,
            recipientNotifiedAt: recipient?.notifiedAt || null,
            recipientRespondedAt: recipient?.respondedAt || null,
          };
        }

        return {
          ...alert,
          recipientStatus: null,
          recipientNotifiedAt: null,
          recipientRespondedAt: null,
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}