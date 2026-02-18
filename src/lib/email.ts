import nodemailer from "nodemailer"

// Create Gmail transporter using App Password
export function createGmailTransporter() {
    if (
        !process.env.GMAIL_USER ||
        !process.env.GMAIL_APP_PASSWORD
    ) {
        console.warn("Gmail credentials not configured")
        return null
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    })

    return transporter
}

// Send email using Gmail App Password
export async function sendEmail({
    to,
    subject,
    html,
    text,
}: {
    to: string
    subject: string
    html?: string
    text?: string
}) {
    const transporter = createGmailTransporter()

    if (!transporter) {
        throw new Error("Gmail transporter not configured")
    }

    try {
        const info = await transporter.sendMail({
            from: `\"Ascomp CRM\" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        })

        console.log("Email sent successfully:", info.messageId)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.error("Failed to send email:", error)
        throw error
    }
}
