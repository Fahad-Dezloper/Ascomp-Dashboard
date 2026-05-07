import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  parseDateOnlyInput,
} from "@/lib/amc-dates";

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

export async function PATCH(
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
    const existing = await prisma.projectorAmc.findFirst({
      where: { id: amcId, projectorId },
    });
    if (!existing) {
      return NextResponse.json({ error: "AMC not found" }, { status: 404 });
    }
    if (existing.certificateBlobUrl) {
      return NextResponse.json(
        {
          error:
            "This AMC has an issued certificate. Delete and recreate, or regenerate PDF only from the certificate action.",
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const data: {
      clientPoNumber?: string;
      invoiceNumber?: string;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (body.clientPoNumber !== undefined) {
      const v = String(body.clientPoNumber).trim();
      if (!v) {
        return NextResponse.json({ error: "clientPoNumber cannot be empty" }, { status: 400 });
      }
      data.clientPoNumber = v;
    }
    if (body.invoiceNumber !== undefined) {
      const v = String(body.invoiceNumber).trim();
      if (!v) {
        return NextResponse.json({ error: "invoiceNumber cannot be empty" }, { status: 400 });
      }
      data.invoiceNumber = v;
    }

    if (body.startDate !== undefined) {
      try {
        data.startDate = parseDateOnlyInput(String(body.startDate));
      } catch {
        return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
      }
    }
    if (body.endDate !== undefined) {
      try {
        data.endDate = parseDateOnlyInput(String(body.endDate));
      } catch {
        return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });
      }
    }

    const nextStart = data.startDate ?? existing.startDate;
    const nextEnd = data.endDate ?? existing.endDate;
    if (nextEnd.getTime() < nextStart.getTime()) {
      return NextResponse.json(
        { error: "endDate must be on or after startDate" },
        { status: 400 },
      );
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await prisma.projectorAmc.update({
      where: { id: amcId },
      data,
    });

    return NextResponse.json({ success: true, amc: serializeAmc(updated) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update AMC" }, { status: 500 });
  }
}

export async function DELETE(
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

    const existing = await prisma.projectorAmc.findFirst({
      where: { id: amcId, projectorId },
    });
    if (!existing) {
      return NextResponse.json({ error: "AMC not found" }, { status: 404 });
    }

    await prisma.projectorAmc.delete({ where: { id: amcId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete AMC" }, { status: 500 });
  }
}
