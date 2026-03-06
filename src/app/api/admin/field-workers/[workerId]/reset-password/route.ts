import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"
import prisma from "@/lib/db"
// Use better-auth's own password hasher so the stored hash is always compatible
import { hashPassword } from "better-auth/crypto"

// POST /api/admin/field-workers/[workerId]/reset-password
// Resets the worker's password to the default (Ascomp123) and emails them.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ workerId: string }> }
) {
  try {
    const { workerId } = await context.params

    const worker = await prisma.user.findUnique({
      where: { id: workerId },
      select: { id: true, name: true, email: true },
    })
    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 })
    }

    const newPassword = "Ascomp123"
    const origin =
      request.headers.get("origin") || process.env.CORS_ORIGIN || "http://localhost:3000"

    // Hash with better-auth's scrypt hasher (salt:hexKey format)
    const hashed = await hashPassword(newPassword)

    // Update the password in the Account table (credential provider row)
    const updated = await prisma.account.updateMany({
      where: {
        userId: workerId,
        providerId: "credential",
      },
      data: { password: hashed },
    })

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "No credential account found for this user." },
        { status: 404 }
      )
    }

    // Email the worker their new password
    try {
      await sendEmail({
        to: worker.email,
        subject: "Ascomp CRM – Password Reset",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Your password has been reset</h2>
            <p>Hello ${worker.name},</p>
            <p>An admin has reset your Ascomp CRM password. Your new credentials are:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Email:</strong> ${worker.email}</p>
              <p style="margin: 5px 0;"><strong>Password:</strong> ${newPassword}</p>
            </div>
            <p>Please log in at: <a href="${origin}/login">${origin}/login</a></p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              For security reasons, please change your password after your first login.
            </p>
          </div>
        `,
      })
    } catch (emailErr) {
      console.error("Failed to send password reset email:", emailErr)
      return NextResponse.json({
        success: true,
        message: "Password reset successfully, but the notification email could not be sent.",
      })
    }

    return NextResponse.json({
      success: true,
      message: `Password reset to default. Credentials emailed to ${worker.email}.`,
    })
  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
  }
}
