import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  computeDefaultInclusiveEndDate,
  parseDateOnlyInput,
} from "@/lib/amc-dates";
import { randomBytes } from "crypto";

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

function newCertificateNumber(): string {
  const y = new Date().getFullYear();
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `AMC-${y}-${suffix}`;
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectorId: string }> },
) {
  try {
    const admin = await requireAdminSession(request);
    if ("error" in admin) return admin.error;
    const { projectorId } = await context.params;

    const projector = await prisma.projector.findUnique({
      where: { id: projectorId },
      select: { id: true, site: { select: { address: true } } },
    });
    if (!projector) {
      return NextResponse.json({ error: "Projector not found" }, { status: 404 });
    }

    const rows = await prisma.projectorAmc.findMany({
      where: { projectorId },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({
      amcPeriods: rows.map(serializeAmc),
      projectorSiteAddress: projector.site.address?.trim() || null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list AMC" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectorId: string }> },
) {
  try {
    const admin = await requireAdminSession(request);
    if ("error" in admin) return admin.error;
    if (admin.user?.accessLevel === "READ_ONLY") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { projectorId } = await context.params;
    const body = await request.json();
    const startRaw = body.startDate as string | undefined;
    const endRaw = body.endDate as string | undefined;
    const autoEndFromStart = Boolean(body.autoEndFromStart);
    const clientPoNumber = String(body.clientPoNumber ?? "").trim();
    const invoiceNumber = String(body.invoiceNumber ?? "").trim();

    if (!startRaw) {
      return NextResponse.json({ error: "startDate is required" }, { status: 400 });
    }
    if (!clientPoNumber || !invoiceNumber) {
      return NextResponse.json(
        { error: "clientPoNumber and invoiceNumber are required" },
        { status: 400 },
      );
    }

    let startDate: Date;
    try {
      startDate = parseDateOnlyInput(startRaw);
    } catch {
      return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
    }

    let endDate: Date;
    if (autoEndFromStart || !endRaw) {
      if (!autoEndFromStart && !endRaw) {
        return NextResponse.json(
          { error: "endDate required unless autoEndFromStart is true" },
          { status: 400 },
        );
      }
      endDate = computeDefaultInclusiveEndDate(startDate);
    } else {
      try {
        endDate = parseDateOnlyInput(endRaw);
      } catch {
        return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });
      }
    }

    if (endDate.getTime() < startDate.getTime()) {
      return NextResponse.json(
        { error: "endDate must be on or after startDate" },
        { status: 400 },
      );
    }

    const projector = await prisma.projector.findUnique({
      where: { id: projectorId },
      include: { site: { select: { siteName: true, address: true } } },
    });
    if (!projector) {
      return NextResponse.json({ error: "Projector not found" }, { status: 404 });
    }

    let certificateNumber = newCertificateNumber();
    for (let i = 0; i < 5; i++) {
      try {
        const created = await prisma.projectorAmc.create({
          data: {
            projectorId,
            siteNameSnapshot: projector.site.siteName,
            siteAddressSnapshot: projector.site.address?.trim()
              ? projector.site.address.trim()
              : null,
            modelNoSnapshot: projector.modelNo,
            serialNoSnapshot: projector.serialNo,
            startDate,
            endDate,
            clientPoNumber,
            invoiceNumber,
            certificateNumber,
          },
        });
        return NextResponse.json({
          success: true,
          amc: serializeAmc(created),
        });
      } catch (err: any) {
        if (err?.code === "P2002") {
          certificateNumber = newCertificateNumber();
          continue;
        }
        throw err;
      }
    }
    return NextResponse.json(
      { error: "Could not allocate certificate number" },
      { status: 500 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create AMC" }, { status: 500 });
  }
}
