// This is the replacement for Preview DownloadDialog in overview-view.tsx
// Replace lines 1541-1666 with this component

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Mail, Download } from "lucide-react"
import { toast } from "sonner"

function PreviewDownloadDialog({
  open,
  onOpenChange,
  serviceId,
  onClose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceId: string | null
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [serviceData, setServiceData] = useState<any>(null)
  const [email, setEmail] = useState("")
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailError, setEmailError] = useState("")

  useEffect(() => {
    if (open && serviceId) {
      const fetchService = async () => {
        try {
          const res = await fetch(`/api/admin/service-records/${serviceId}`, {
            credentials: "include",
          })
          if (res.ok) {
            const json = await res.json()
            const service = json.service || json
            setServiceData(service)

            // Set default email if site has contact email
            if (service.contactDetails && service.contactDetails.includes("@")) {
              setEmail(service.contactDetails)
            }

            // Generate default email content
            generateDefaultEmailContent(service)
          }
        } catch (error) {
          console.error("Failed to fetch service:", error)
        }
      }
      fetchService()
    }
  }, [open, serviceId])

  const generateDefaultEmailContent = (service: any) => {
    const cinema = service.cinemaName || service.siteName || "Valued Client"
    const serviceNum = service.serviceNumber || "N/A"
    const modelNo =
      service.projector?.model ||
      service.modelNo ||
      service.projectorModel ||
      "N/A"
    const serialNo = service.projector?.serialNo || service.projectorSerial || "N/A"
    const screenNo = service.screenNumber || service.site?.screenNo || "N/A"
    const date = service.date
      ? (() => {
          const d = new Date(service.date)
          const day = d.getDate()
          const month = d.toLocaleString("en-US", { month: "long" })
          const year = d.getFullYear()
          const ord = (n: number) => {
            if (n >= 11 && n <= 13) return n + "th"
            const s = ["th", "st", "nd", "rd"]
            return n + (s[n % 10] || "th")
          }
          return `${ord(day)} ${month}, ${year}`
        })()
      : "N/A"

    // Parse recommended parts
    let recommendedPartsText = ""
    try {
      const workDetails = typeof service.workDetails === 'string'
        ? JSON.parse(service.workDetails)
        : service.workDetails

      const parts = workDetails?.recommendedParts || service.recommendedParts || []
      const partsArray = typeof parts === 'string' ? JSON.parse(parts) : parts

      if (Array.isArray(partsArray) && partsArray.length > 0) {
        recommendedPartsText = `

${partsArray.map((part, idx) =>
          `${idx + 1}. Part Number: ${part.part_number || part.partNumber}
   Description: ${part.description || part.name}`
        ).join('\n\n')}`
      }
    } catch (e) {
      console.error("Failed to parse recommended parts:", e)
    }

    setEmailSubject(`Projector Service Report - ${cinema} - ${serviceNum}`)
    setEmailBody(`Dear Team,
Good day!!!
The service was performed on ${date} for the Christie Projector – <strong>Model Number:</strong> ${modelNo}, <strong>Serial Number:</strong> ${serialNo} installed in <strong>Auditorium</strong> ${screenNo}. During the inspection, it was observed that the below parts require replacement due to aging/physical wear.${recommendedPartsText}

You are advised to provide the Purchase Order (PO) for the above-mentioned parts so that we can proceed with executing the replacement.
Thank you for choosing Ascomp Inc.

Best regards,
Ascomp INC
www.ascompinc.in`)
  }

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const handleDownloadPDF = async () => {
    if (!serviceId) return
    try {
      setLoading(true)
      const { constructAndGeneratePDF } = await import('@/lib/pdf-helper')
      const pdfBytes = await constructAndGeneratePDF(serviceId)

      const blob = new Blob([pdfBytes as any], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${serviceData?.projector?.serialNo || serviceData?.projectorSerial || 'Service_Report'}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)

      toast.success("PDF downloaded successfully")
    } catch (error) {
      console.error("Failed to generate PDF:", error)
      toast.error("Failed to generate PDF. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleShowEmailPreview = () => {
    setEmailError("")

    if (!email || !validateEmail(email)) {
      setEmailError("Please enter a valid email address")
      return
    }

    setShowEmailPreview(true)
  }

  const handleSendEmail = async () => {
    if (!email || !validateEmail(email)) {
      setEmailError("Please enter a valid email address")
      return
    }

    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Email subject and body cannot be empty")
      return
    }

    try {
      setSendingEmail(true)
      const response = await fetch("/api/admin/service-records/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId,
          recipientEmail: email,
          emailContent: {
            subject: emailSubject,
            body: emailBody.replace(/\n/g, "<br>"),
          },
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to send email")
      }

      toast.success("Email sent successfully", {
        description: `Service report has been sent to ${email}`,
      })

      // Reset email preview
      setShowEmailPreview(false)
    } catch (error) {
      console.error("Error sending email:", error)
      toast.error("Failed to send email", {
        description: error instanceof Error ? error.message : "An error occurred",
      })
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview & Send Service Report</DialogTitle>
        </DialogHeader>
        {serviceData ? (
          <div className="space-y-4 mt-4">
            {!showEmailPreview ? (
              <>
                {/* Service Preview */}
                <div className="border-t pt-4 space-y-2">
                  <h3 className="font-semibold text-lg">Service Preview</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Service #:</span> {serviceData.serviceNumber}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span>{" "}
                      {serviceData.date ? new Date(serviceData.date).toLocaleDateString() : "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Cinema:</span> {serviceData.cinemaName || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Projector Model:</span> {serviceData.projectorModel || serviceData.modelNo || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-2 border-t pt-4">
                  <label className="block text-sm font-semibold">Recipient Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setEmailError("")
                    }}
                    placeholder="client@example.com"
                    className={`border-2 ${emailError ? "border-red-500" : "border-black"}`}
                  />
                  {emailError && (
                    <p className="text-sm text-red-600">{emailError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter the email address where the service report PDF should be sent.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                  <Button onClick={handleDownloadPDF} disabled={loading} className="bg-black text-white">
                    <Download className="h-4 w-4 mr-2" />
                    {loading ? "Generating..." : "Download PDF"}
                  </Button>
                  <Button
                    onClick={handleShowEmailPreview}
                    disabled={!email || loading}
                    className="bg-black text-white"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Preview Email
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Email Preview & Edit */}
                <div className="space-y-4">
                  {/* <div className="bg-blue-50 border border-blue-200 rounded-md p-3"> */}
                  {/* <p className="text-sm text-blue-900">
                      <strong>✉️ Email Preview</strong> - Review and edit the email content below before sending.
                    </p> */}
                  {/* </div> */}

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">To:</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-2 border-black"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">Subject:</label>
                    <Input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="border-2 border-black"
                      placeholder="Enter email subject"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">Message:</label>
                    <Textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="border-2 border-black min-h-[300px] font-mono text-sm"
                      placeholder="Enter email message"
                    />
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-xs text-gray-600">
                      <strong>📎 Attachment:</strong> {serviceData?.projector?.serialNo || serviceData?.projectorSerial || 'Service_Report'}.pdf
                    </p>
                  </div>
                </div>

                {/* Preview Action Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowEmailPreview(false)}
                    disabled={sendingEmail}
                  >
                    ← Back
                  </Button>
                  <Button
                    onClick={handleSendEmail}
                    disabled={sendingEmail || !email || !validateEmail(email)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {sendingEmail ? "Sending..." : "Send Email"}
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">Loading service data...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default PreviewDownloadDialog
