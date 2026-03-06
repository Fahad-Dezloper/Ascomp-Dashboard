import { NextRequest, NextResponse } from "next/server"
import prisma, { ServiceStatus } from "@/lib/db"
import { sendEmail } from "@/lib/email"

// Helper to generate Mongo-style IDs (since schema uses string IDs)
const generateObjectId = () => [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join("")

// Helper to convert number to ordinal word
const numberToOrdinalWord = (num: number): string => {
  const ordinals = [
    "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
    "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth",
    "Eighteenth", "Nineteenth", "Twentieth", "Twenty-First", "Twenty-Second", "Twenty-Third",
    "Twenty-Fourth", "Twenty-Fifth", "Twenty-Sixth", "Twenty-Seventh", "Twenty-Eighth",
    "Twenty-Ninth", "Thirtieth", "Thirty-First", "Thirty-Second", "Thirty-Third", "Thirty-Fourth",
    "Thirty-Fifth", "Thirty-Sixth", "Thirty-Seventh", "Thirty-Eighth", "Thirty-Ninth", "Fortieth",
    "Forty-First", "Forty-Second", "Forty-Third", "Forty-Fourth", "Forty-Fifth", "Forty-Sixth",
    "Forty-Seventh", "Forty-Eighth", "Forty-Ninth", "Fiftieth", "Fifty-First", "Fifty-Second",
    "Fifty-Third", "Fifty-Fourth", "Fifty-Fifth", "Fifty-Sixth", "Fifty-Seventh", "Fifty-Eighth",
    "Fifty-Ninth", "Sixtieth", "Sixty-First", "Sixty-Second", "Sixty-Third", "Sixty-Fourth",
    "Sixty-Fifth", "Sixty-Sixth", "Sixty-Seventh", "Sixty-Eighth", "Sixty-Ninth", "Seventieth",
    "Seventy-First", "Seventy-Second", "Seventy-Third", "Seventy-Fourth", "Seventy-Fifth",
    "Seventy-Sixth", "Seventy-Seventh", "Seventy-Eighth", "Seventy-Ninth", "Eightieth",
    "Eighty-First", "Eighty-Second", "Eighty-Third", "Eighty-Fourth", "Eighty-Fifth",
    "Eighty-Sixth", "Eighty-Seventh", "Eighty-Eighth", "Eighty-Ninth", "Ninetieth",
    "Ninety-First", "Ninety-Second", "Ninety-Third", "Ninety-Fourth", "Ninety-Fifth",
    "Ninety-Sixth", "Ninety-Seventh", "Ninety-Eighth", "Ninety-Ninth", "One Hundredth"
  ]

  if (num >= 1 && num <= 100) {
    return ordinals[num - 1]!
  }

  // Fallback for numbers beyond 100
  return `${num}th`
}

export async function POST(request: NextRequest) {
  try {
    const { siteId, projectorId, fieldWorkerId, scheduledDate } = await request.json()

    if (!siteId || !projectorId || !fieldWorkerId || !scheduledDate) {
      return NextResponse.json(
        { error: "Site, projector, field worker and scheduled date are required." },
        { status: 400 },
      )
    }

    const site = await prisma.site.findUnique({
      where: { id: siteId },
    })
    if (!site) {
      return NextResponse.json({ error: "Site not found." }, { status: 404 })
    }

    const projector = await prisma.projector.findUnique({
      where: { id: projectorId },
      select: {
        id: true,
        siteId: true,
        serialNo: true,
        modelNo: true,
        pvr: true,
      },
    })
    if (!projector || projector.siteId !== siteId) {
      return NextResponse.json({ error: "Projector not found for this site." }, { status: 404 })
    }

    const fieldWorker = await prisma.user.findFirst({
      where: { id: fieldWorkerId, role: "FIELD_WORKER" },
      select: { id: true, email: true, name: true, pvrAccess: true },
    })
    if (!fieldWorker || !fieldWorker.email) {
      return NextResponse.json({ error: "Field worker not found." }, { status: 404 })
    }

    // PVR restriction: check that the field worker is allowed to service this projector type
    if (projector.pvr && fieldWorker.pvrAccess !== "BOTH") {
      if (fieldWorker.pvrAccess !== projector.pvr) {
        const workerLabel = fieldWorker.pvrAccess === "PVR" ? "PVR" : "Non-PVR"
        const projectorLabel = projector.pvr === "PVR" ? "PVR" : "Non-PVR"
        return NextResponse.json(
          {
            error: `This field worker is restricted to ${workerLabel} projectors only, but the selected projector is ${projectorLabel}.`,
          },
          { status: 403 },
        )
      }
    }

    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    })
    if (!admin) {
      return NextResponse.json({ error: "Admin user not found." }, { status: 500 })
    }

    const parsedDate = new Date(scheduledDate)
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid scheduled date." }, { status: 400 })
    }

    // Check if an uncompleted service record already exists for this projector
    const existingRecord = await prisma.serviceRecord.findFirst({
      where: {
        projectorId,
        date: null,  // Not completed yet
      },
      orderBy: {
        createdAt: "desc",  // Get the latest one
      },
    })

    let record

    if (existingRecord) {
      // Update the existing service record with new assignment
      record = await prisma.serviceRecord.update({
        where: { id: existingRecord.id },
        data: {
          assignedToId: fieldWorker.id,
        },
      })
    } else {
      // Create a new service record
      // Find the highest service number for this projector to avoid unique constraint violations
      const existingRecords = await prisma.serviceRecord.findMany({
        where: { projectorId },
        select: { serviceNumber: true },
      })

      // Parse ordinal words back to numbers to find the max
      const ordinalToNumber = (ordinal: string): number => {
        const ordinals = [
          "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
          "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth",
          "Eighteenth", "Nineteenth", "Twentieth", "Twenty-First", "Twenty-Second", "Twenty-Third",
          "Twenty-Fourth", "Twenty-Fifth", "Twenty-Sixth", "Twenty-Seventh", "Twenty-Eighth",
          "Twenty-Ninth", "Thirtieth", "Thirty-First", "Thirty-Second", "Thirty-Third", "Thirty-Fourth",
          "Thirty-Fifth", "Thirty-Sixth", "Thirty-Seventh", "Thirty-Eighth", "Thirty-Ninth", "Fortieth",
          "Forty-First", "Forty-Second", "Forty-Third", "Forty-Fourth", "Forty-Fifth", "Forty-Sixth",
          "Forty-Seventh", "Forty-Eighth", "Forty-Ninth", "Fiftieth", "Fifty-First", "Fifty-Second",
          "Fifty-Third", "Fifty-Fourth", "Fifty-Fifth", "Fifty-Sixth", "Fifty-Seventh", "Fifty-Eighth",
          "Fifty-Ninth", "Sixtieth", "Sixty-First", "Sixty-Second", "Sixty-Third", "Sixty-Fourth",
          "Sixty-Fifth", "Sixty-Sixth", "Sixty-Seventh", "Sixty-Eighth", "Sixty-Ninth", "Seventieth",
          "Seventy-First", "Seventy-Second", "Seventy-Third", "Seventy-Fourth", "Seventy-Fifth",
          "Seventy-Sixth", "Seventy-Seventh", "Seventy-Eighth", "Seventy-Ninth", "Eightieth",
          "Eighty-First", "Eighty-Second", "Eighty-Third", "Eighty-Fourth", "Eighty-Fifth",
          "Eighty-Sixth", "Eighty-Seventh", "Eighty-Eighth", "Eighty-Ninth", "Ninetieth",
          "Ninety-First", "Ninety-Second", "Ninety-Third", "Ninety-Fourth", "Ninety-Fifth",
          "Ninety-Sixth", "Ninety-Seventh", "Ninety-Eighth", "Ninety-Ninth", "One Hundredth"
        ]
        const index = ordinals.indexOf(ordinal)
        return index !== -1 ? index + 1 : 0
      }

      const maxServiceNumber = existingRecords.reduce((max, record) => {
        const num = ordinalToNumber(record.serviceNumber || "")
        return num > max ? num : max
      }, 0)

      const nextServiceNumber = maxServiceNumber + 1

      record = await prisma.serviceRecord.create({
        data: {
          id: generateObjectId(),
          userId: admin.id,
          assignedToId: fieldWorker.id,
          projectorId: projector.id,
          siteId: site.id,
          serviceNumber: numberToOrdinalWord(nextServiceNumber) as any,
          cinemaName: site.siteName,
          address: site.address,
          contactDetails: site.contactDetails,
          location: site.address,
        },
      })
    }

    // Update projector status to SCHEDULED
    await prisma.projector.update({
      where: { id: projectorId },
      data: {
        status: ServiceStatus.SCHEDULED,
      },
    })

    // Send email notification to field worker
    try {
      const formattedDate = new Date(scheduledDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      // fieldWorker.email

      await sendEmail({
        to: fieldWorker.email,
        subject: `New Service Assignment - ${site.siteName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Service Assignment</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                  New Service Assignment
                </h1>
                <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                  A new service has been assigned to you
                </p>
              </div>

              <!-- Content -->
              <div style="padding: 40px 30px;">
                <!-- Greeting -->
                <p style="margin: 0 0 25px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                  Hello <strong>${fieldWorker.name}</strong>,
                </p>
                
                <p style="margin: 0 0 30px 0; color: #555555; font-size: 15px; line-height: 1.6;">
                  You have been assigned a new projector service. Please review the details below:
                </p>

                <!-- Site Information Card -->
                <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 25px; border-radius: 4px;">
                  <h2 style="margin: 0 0 15px 0; color: #667eea; font-size: 18px; font-weight: 600;">
                    Site Information
                  </h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #666666; font-size: 14px; font-weight: 500;">Site Name:</td>
                      <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 600; text-align: right;">${site.siteName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666666; font-size: 14px; font-weight: 500;">Address:</td>
                      <td style="padding: 8px 0; color: #333333; font-size: 14px; text-align: right;">${site.address}</td>
                    </tr>
                    ${site.contactDetails ? `
                    <tr>
                      <td style="padding: 8px 0; color: #666666; font-size: 14px; font-weight: 500;">Contact:</td>
                      <td style="padding: 8px 0; color: #333333; font-size: 14px; text-align: right;">${site.contactDetails}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>

                <!-- Projector Information Card -->
                <div style="background-color: #f8f9fa; border-left: 4px solid #764ba2; padding: 20px; margin-bottom: 25px; border-radius: 4px;">
                  <h2 style="margin: 0 0 15px 0; color: #764ba2; font-size: 18px; font-weight: 600;">
                    Projector Information
                  </h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #666666; font-size: 14px; font-weight: 500;">Model:</td>
                      <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 600; text-align: right;">${projector.modelNo}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666666; font-size: 14px; font-weight: 500;">Serial Number:</td>
                      <td style="padding: 8px 0; color: #333333; font-size: 14px; font-family: monospace; text-align: right;">${projector.serialNo}</td>
                    </tr>
                  </table>
                </div>

                <!-- Schedule Information Card -->
                <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                  <h2 style="margin: 0 0 15px 0; color: #4caf50; font-size: 18px; font-weight: 600;">
                    Scheduled Date
                  </h2>
                  <p style="margin: 0; color: #333333; font-size: 16px; font-weight: 600;">
                    ${formattedDate}
                  </p>
                </div>

                <!-- Call to Action -->
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/user/workflow" 
                     style="display: inline-block; background: #28C5CC">
                    View in Dashboard
                  </a>
                </div>
              </div>

              <!-- Footer -->
              <div style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="margin: 0 0 8px 0; color: #6c757d; font-size: 13px;">
                  This is an automated notification from Ascomp CRM
                </p>
                <p style="margin: 0; color: #6c757d; font-size: 13px;">
                  © ${new Date().getFullYear()} Ascomp. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      })
      console.log("Service assignment email sent successfully to:", fieldWorker.email)
    } catch (emailError) {
      console.error("Failed to send service assignment email:", emailError)
      // Don't fail the request if email fails, but log it
    }

    return NextResponse.json({
      success: true,
      serviceRecord: {
        id: record.id,
        date: record.date,
        assignedToId: fieldWorker.id,
      },
    })
  } catch (error) {
    console.error("Error scheduling service:", error)
    return NextResponse.json({ error: "Failed to schedule service" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { serviceRecordId } = await request.json()

    if (!serviceRecordId) {
      return NextResponse.json(
        { error: "Service record ID is required." },
        { status: 400 },
      )
    }

    // Find the service record to get projector ID
    const serviceRecord = await prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
      select: {
        id: true,
        projectorId: true,
        endTime: true,
        reportGenerated: true,
      },
    })

    if (!serviceRecord) {
      return NextResponse.json({ error: "Service record not found." }, { status: 404 })
    }

    // Only allow deletion of scheduled/in-progress services (not completed ones)
    if (serviceRecord.endTime !== null || serviceRecord.reportGenerated === true) {
      return NextResponse.json(
        { error: "Cannot delete completed service records." },
        { status: 400 },
      )
    }

    const projectorId = serviceRecord.projectorId

    // Delete the service record
    await prisma.serviceRecord.delete({
      where: { id: serviceRecordId },
    })

    // Check if there are any other scheduled/in-progress services for this projector
    const remainingScheduledServices = await prisma.serviceRecord.findFirst({
      where: {
        projectorId,
        date: null,  // Uncompleted services
      },
    })

    // If no more scheduled services, recalculate projector status based on last completed service
    if (!remainingScheduledServices) {
      // Find the last completed service
      const lastCompletedService = await prisma.serviceRecord.findFirst({
        where: {
          projectorId,
          date: { not: null },  // Completed services have date set
        },
        orderBy: { date: 'desc' },
        select: { date: true },
      })

      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      let newStatus: ServiceStatus
      let lastServiceAt: Date | null = null

      if (lastCompletedService?.date) {
        lastServiceAt = lastCompletedService.date
        newStatus = lastCompletedService.date >= sixMonthsAgo
          ? ServiceStatus.COMPLETED
          : ServiceStatus.PENDING
      } else {
        // No completed services - PENDING
        newStatus = ServiceStatus.PENDING
      }

      await prisma.projector.update({
        where: { id: projectorId },
        data: {
          status: newStatus,
          lastServiceAt,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Service record deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting service record:", error)
    return NextResponse.json({ error: "Failed to delete service record" }, { status: 500 })
  }
}

