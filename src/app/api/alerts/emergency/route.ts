import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const userId = decodedToken.userId;
    
    const { title, description } = await request.json();
    
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Create the alert
    const alert = await prisma.alert.create({
      data: {
        userId,
        title,
        description: description || undefined,
        status: "ACTIVE",
      },
      include: {
        user: {
          select: { 
            id: true, 
            name: true, 
            email: true,
            image: true
          }
        }
      }
    });

    // Get the user's trusted contacts to send the alert to
    const trustedContacts = await prisma.trustedContact.findMany({
      where: {
        ownerId: userId,
        status: "ACCEPTED", // Only send to accepted contacts
      },
      select: {
        contactId: true,
      }
    });

    // Create alert recipients for each trusted contact
    if (trustedContacts.length > 0) {
      for (const contact of trustedContacts) {
        await prisma.alertRecipient.create({
          data: {
            alertId: alert.id,
            contactId: contact.contactId,
            status: "PENDING",
            notifiedAt: new Date(),
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      alertId: alert.id,
      recipients: trustedContacts.map(c => c.contactId)
    });
  } catch (error) {
    console.error("Error creating emergency alert:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}