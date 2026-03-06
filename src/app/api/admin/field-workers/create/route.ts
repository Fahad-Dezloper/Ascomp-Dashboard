import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/email"
import prisma, { Role } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, name, role = "FIELD_WORKER", accessLevel, pvrAccess = "BOTH" } = await request.json()

    if (!email || !name) {
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    const password = `Ascomp123`

    // Create user using better-auth sign-up
    const origin = request.headers.get("origin") || process.env.CORS_ORIGIN || "http://localhost:3000"
    const url = new URL("/api/auth/sign-up/email", origin)
    const signUpRequest = new Request(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name,
        role: role === "ADMIN" ? Role.ADMIN : Role.FIELD_WORKER,
      }),
    })

    const signUpResponse = await auth.handler(signUpRequest)

    if (!signUpResponse.ok) {
      const errorText = await signUpResponse.text()
      console.error("Failed to create user:", errorText)
      return NextResponse.json(
        { error: "Failed to create field worker account" },
        { status: 500 },
      )
    }

    const signUpData = await signUpResponse.json()

    if (!signUpData || !signUpData.user) {
      return NextResponse.json(
        { error: "Failed to create field worker account" },
        { status: 500 },
      )
    }

    // Ensure role, access level, and pvr access are set
    await prisma.user.update({
      where: { id: signUpData.user.id },
      data: {
        role: role === "ADMIN" ? Role.ADMIN : Role.FIELD_WORKER,
        accessLevel: role === "ADMIN" && accessLevel ? accessLevel : null,
        pvrAccess: (pvrAccess === "PVR" || pvrAccess === "NonPVR" || pvrAccess === "BOTH") ? pvrAccess : "BOTH",
      },
    })

    // Send email with login credentials using Gmail OAuth
    try {
      await sendEmail({
        to: email,
        subject: "Welcome to Ascomp CRM - Your Login Credentials",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to Ascomp CRM!</h2>
            <p>Hello ${name},</p>
            <p>Your account has been created. Please use the following credentials to log in:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
            </div>
            <p>Please log in at: <a href="${origin}/login">${origin}/login</a></p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">For security reasons, please change your password after your first login.</p>
          </div>
        `,
      })
      console.log("Welcome email sent successfully to:", email)
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError)
      // Don't fail the request if email fails, but log it
    }

    return NextResponse.json({
      success: true,
      user: {
        id: signUpData.user.id,
        email: signUpData.user.email,
        name: signUpData.user.name,
      },
      message: "Field worker created successfully. Login credentials have been sent to their email.",
    })
  } catch (error) {
    console.error("Error creating field worker:", error)
    return NextResponse.json(
      { error: "Failed to create field worker" },
      { status: 500 },
    )
  }
}

