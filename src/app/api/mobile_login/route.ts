import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import jwt from "jsonwebtoken"
import { compare } from "bcryptjs"

// const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const JWT_SECRET = process.env.NEXTAUTH_SECRET as string

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const {
      email,
      password,
      device_id: deviceId,
      device_name: deviceName,
      platform,
    } = await request.json();

    if (!deviceId) {
      return NextResponse.json(
        { error: "deviceId is required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await compare(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Check if device exists, if not create it
    let device = await prisma.device.findUnique({
      where: { deviceId },
    })

    if (!device) {
      device = await prisma.device.create({
        data: {
          deviceId,
          deviceName,
          platform,
          userId: user.id,
        },
      })
    } else {
      // Update device info and mark as active
      device = await prisma.device.update({
        where: { deviceId },
        data: {
          deviceName,
          platform,
          lastSeen: new Date(),
          isActive: true,
          userId: user.id,
        },
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, deviceId: device.id },
      JWT_SECRET,
      { expiresIn: "30d" }
    )

    // Create or update mobile session
    await prisma.mobileSession.upsert({
      where: { token },
      update: {
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        lastActivity: new Date(),
      },
      create: {
        token,
        deviceId: device.id,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      device: {
        id: device.id,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
      },
    })
  } catch (error) {
    console.error("Mobile login error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}