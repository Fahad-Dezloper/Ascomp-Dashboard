import { NextRequest, NextResponse } from "next/server"
import prisma, { ServiceStatus } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { assignProjectorToFieldWorker } from "@/lib/projector-service-assignment"

export async function POST(request: NextRequest) {
  try {
    const { siteId, projectorId, fieldWorkerId, scheduledDate } = await request.json()

    if (!siteId || !projectorId || !fieldWorkerId || !scheduledDate) {
      return NextResponse.json(
        { error: "Site, projector, field worker and scheduled date are required." },
        { status: 400 },
      )
    }

    const fieldWorker = await prisma.user.findFirst({
      where: { id: fieldWorkerId, role: "FIELD_WORKER" },
      select: { id: true, email: true, name: true, pvrAccess: true },
    })
    if (!fieldWorker || !fieldWorker.email) {
      return NextResponse.json({ error: "Field worker not found." }, { status: 404 })
    }

    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    })
    if (!admin) {
      return NextResponse.json({ error: "Admin user not found." }, { status: 500 })
    }

    const assigned = await assignProjectorToFieldWorker({
      siteId,
      projectorId,
      fieldWorker: {
        id: fieldWorker.id,
        email: fieldWorker.email,
        name: fieldWorker.name,
        pvrAccess: fieldWorker.pvrAccess,
      },
      recordUserId: admin.id,
      scheduledDate,
      allowOverrideAssignee: true,
    })

    if (!assigned.ok) {
      return NextResponse.json({ error: assigned.error }, { status: assigned.status })
    }

    const { record, site, projector, fieldWorker: assignedWorker, scheduledDate: dateStr } = assigned

    // Send email notification to field worker
    try {
      const formattedDate = new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      await sendEmail({
        to: assignedWorker.email!,
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
                  Hello <strong>${assignedWorker.name}</strong>,
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
      console.log("Service assignment email sent successfully to:", assignedWorker.email)
    } catch (emailError) {
      console.error("Failed to send service assignment email:", emailError)
      // Don't fail the request if email fails, but log it
    }

    return NextResponse.json({
      success: true,
      serviceRecord: {
        id: record.id,
        date: record.date,
        assignedToId: assignedWorker.id,
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

