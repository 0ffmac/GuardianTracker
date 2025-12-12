import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { randomBytes } from "crypto"
import { sendVerificationEmail } from "@/lib/email";

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""
    const passwordStr = typeof password === "string" ? password : ""

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      )
    }

    if (passwordStr.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(passwordStr, 12)

    // Create user (unverified)
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        emailVerified: null,
      },
    })

    // Create verification token
    const token = randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token,
        expires,
      },
    })

    const origin = request.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? ""
    const verificationUrl = `${origin}/api/auth/verify-email?token=${encodeURIComponent(
      token
    )}&email=${encodeURIComponent(normalizedEmail)}`

    // TODO: Replace this console.log with real email sending
    // console.log("Email verification link:", verificationUrl)
    await sendVerificationEmail(normalizedEmail, verificationUrl);

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
