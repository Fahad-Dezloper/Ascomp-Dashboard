import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { buildAmcCertificatePdfBuffer } from "@/lib/amc-certificate-pdf";

async function requireAdminSession(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { accessLevel: true },
  });
  return { session, user };
}

function serializeAmc(r: {
  id: string;
  projectorId: string;
  siteNameSnapshot: string;
  siteAddressSnapshot: string | null;
  modelNoSnapshot: string;
  serialNoSnapshot: string;
  startDate: Date;
  endDate: Date;
  clientPoNumber: string;
  invoiceNumber: string;
  certificateNumber: string;
  certificateBlobUrl: string | null;
  certificateIssuedAt: Date | null;
  createdAt: Date;
}) {
  const d = (x: Date) => x.toISOString().slice(0, 10);
  return {
    id: r.id,
    projectorId: r.projectorId,
    siteNameSnapshot: r.siteNameSnapshot,
    siteAddressSnapshot: r.siteAddressSnapshot,
    modelNoSnapshot: r.modelNoSnapshot,
    serialNoSnapshot: r.serialNoSnapshot,
    startDate: d(r.startDate),
    endDate: d(r.endDate),
    clientPoNumber: r.clientPoNumber,
    invoiceNumber: r.invoiceNumber,
    certificateNumber: r.certificateNumber,
    certificateBlobUrl: r.certificateBlobUrl,
    certificateIssuedAt: r.certificateIssuedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectorId: string; amcId: string }> },
) {
  try {
    const admin = await requireAdminSession(request);
    if ("error" in admin) return admin.error;
    if (admin.user?.accessLevel === "READ_ONLY") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { projectorId, amcId } = await context.params;
    const row = await prisma.projectorAmc.findFirst({
      where: { id: amcId, projectorId },
    });
    if (!row) {
      return NextResponse.json({ error: "AMC not found" }, { status: 404 });
    }

    const buffer = buildAmcCertificatePdfBuffer({
      certificateNumber: row.certificateNumber,
      siteName:
        row.siteAddressSnapshot?.trim() || row.siteNameSnapshot,
      modelNo: row.modelNoSnapshot,
      serialNo: row.serialNoSnapshot,
      startDate: row.startDate,
      endDate: row.endDate,
      clientPoNumber: row.clientPoNumber,
      invoiceNumber: row.invoiceNumber,
    });

    const safeSerial = row.serialNoSnapshot.replace(/[^\w.-]+/g, "_");
    const fileName = `amc/certificates/${row.certificateNumber}-${safeSerial}.pdf`;

    const blob = await put(fileName, buffer, {
      access: "public",
      contentType: "application/pdf",
    });

    const updated = await prisma.projectorAmc.update({
      where: { id: amcId },
      data: {
        certificateBlobUrl: blob.url,
        certificateIssuedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      amc: serializeAmc(updated),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to generate certificate", details: String(e) },
      { status: 500 },
    );
  }
}
