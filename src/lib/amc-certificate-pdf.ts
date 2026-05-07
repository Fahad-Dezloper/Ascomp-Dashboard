import { jsPDF } from "jspdf";
import { formatAmcDateForDisplay } from "@/lib/amc-dates";

export type AmcCertificateInput = {
  certificateNumber: string;
  siteName: string;
  modelNo: string;
  serialNo: string;
  startDate: Date;
  endDate: Date;
  clientPoNumber: string;
  invoiceNumber: string;
  issuerCompanyName?: string;
};

export function buildAmcCertificatePdfBuffer(
  data: AmcCertificateInput,
): Buffer {
  const company =
    data.issuerCompanyName?.trim() || "Ascomp INC — Service Portal";

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("AMC CONFIRMATION CERTIFICATE", pageW / 2, y, { align: "center" });
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    "This certificate confirms Annual Maintenance Contract (AMC) coverage details as stated below.",
    pageW / 2,
    y,
    { align: "center", maxWidth: pageW - 36 },
  );
  y += 14;

  doc.setDrawColor(40);
  doc.line(18, y, pageW - 18, y);
  y += 8;

  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label, 18, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value || "—", pageW - 70);
    doc.text(lines, 70, y);
    y += 6 + (lines.length - 1) * 5;
  };

  row("Certificate no.", data.certificateNumber);
  row("Cinema / Site", data.siteName);
  row("Projector model", data.modelNo);
  row("Serial number", data.serialNo);
  row(
    "AMC coverage period (inclusive)",
    `${formatAmcDateForDisplay(data.startDate)} to ${formatAmcDateForDisplay(data.endDate)}`,
  );
  row("Client PO number", data.clientPoNumber);
  row("Our invoice number", data.invoiceNumber);

  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(
    "Coverage is valid on both the start and end dates shown above, unless otherwise agreed in writing.",
    18,
    y,
    { maxWidth: pageW - 36 },
  );
  y += 14;

  doc.setTextColor(0);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text(`Issued by: ${company}`, 18, y);
  y += 5;
  doc.text(`Issue date: ${formatAmcDateForDisplay(new Date())}`, 18, y);

  return Buffer.from(doc.output("arraybuffer"));
}
