import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET a single user by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const user = await prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("GET user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// UPDATE a user by ID (only self)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id as string;
    const id = params.id;

    if (userId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({} as any));
    const data: any = {};
    if (typeof body.name === "string") data.name = body.name.trim();
    if (typeof body.email === "string") data.email = body.email.trim();
    if (typeof body.image === "string") data.image = body.image.trim();

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    });
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("UPDATE user error", error);
    if ((error as any).code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE a user by ID and all related data
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;
  if (userId !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    // Delete all related data for the user
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.device.deleteMany({ where: { userId } });
    await prisma.location.deleteMany({ where: { userId } });
    await prisma.mobileSession.deleteMany({ where: { userId } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.trackingSession.deleteMany({ where: { userId } });
    // Finally, delete the user
    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ message: "User and all related data deleted successfully" });
  } catch (error) {
    console.error("DELETE user error:", error);
    if ((error as any).code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
