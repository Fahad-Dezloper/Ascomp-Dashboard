import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { withAmcCycleNumbers } from "@/lib/amc-cycles";
import { getProjectorIdsMatchingMasterSiteFreeText } from "@/lib/amc-master-site-match";

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

function dOnly(x: Date) {
  return x.toISOString().slice(0, 10);
}

/** AMC snapshot fields only (historical venue text). Master site/projector matching is JS-normalized separately. */
function snapshotOnlySiteFilter(siteQuery: string): Prisma.ProjectorAmcWhereInput {
  const normalized = siteQuery.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return {};
  }

  const slice = (needle: string): Prisma.ProjectorAmcWhereInput => ({
    OR: [
      { siteNameSnapshot: { contains: needle, mode: "insensitive" } },
      { siteAddressSnapshot: { contains: needle, mode: "insensitive" } },
    ],
  });

  const tokens = normalized
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 12);

  const phraseClause = slice(normalized);

  if (tokens.length <= 1) {
    return phraseClause;
  }

  return {
    OR: [
      phraseClause,
      { AND: tokens.map((tok) => slice(tok)) },
    ],
  };
}

async function siteQueryWhere(siteQuery: string): Promise<Prisma.ProjectorAmcWhereInput> {
  const snapshot = snapshotOnlySiteFilter(siteQuery);
  const masterIds = await getProjectorIdsMatchingMasterSiteFreeText(siteQuery);

  const branches: Prisma.ProjectorAmcWhereInput[] = [];
  if (masterIds.length > 0) {
    branches.push({ projectorId: { in: masterIds } });
  }
  const snapKeys = Object.keys(snapshot);
  if (snapKeys.length > 0) {
    branches.push(snapshot);
  }

  if (branches.length === 0) {
    return { projectorId: { in: [] } };
  }
  if (branches.length === 1) {
    return branches[0]!;
  }
  return { OR: branches };
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminSession(request);
    if ("error" in admin) return admin.error;

    const { searchParams } = new URL(request.url);
    const siteQuery = searchParams.get("siteName")?.trim() ?? "";
    const serial = searchParams.get("serial")?.trim() ?? "";

    if (!siteQuery && !serial) {
      return NextResponse.json({ groups: [] });
    }

    const andFilters: Prisma.ProjectorAmcWhereInput[] = [];
    if (siteQuery) {
      andFilters.push(await siteQueryWhere(siteQuery));
    }
    if (serial) {
      andFilters.push({
        OR: [
          { projector: { serialNo: { contains: serial, mode: "insensitive" } } },
          { serialNoSnapshot: { contains: serial, mode: "insensitive" } },
        ],
      });
    }

    const rows = await prisma.projectorAmc.findMany({
      where: { AND: andFilters },
      include: {
        projector: {
          select: {
            id: true,
            serialNo: true,
            modelNo: true,
            siteId: true,
            site: { select: { id: true, siteName: true, address: true } },
          },
        },
      },
      orderBy: [{ projectorId: "asc" }, { startDate: "asc" }],
    });

    type Bucket = {
      siteId: string;
      siteName: string;
      siteAddress: string | null;
      projectorId: string;
      serialNo: string;
      modelNo: string;
      periods: Array<{
        id: string;
        startDate: string;
        endDate: string;
        certificateNumber: string;
      }>;
    };

    const projectorBuckets = new Map<string, Bucket>();

    for (const r of rows) {
      const pid = r.projector.id;
      let b = projectorBuckets.get(pid);
      if (!b) {
        b = {
          siteId: r.projector.site.id,
          siteName: r.projector.site.siteName,
          siteAddress:
            typeof r.projector.site.address === "string"
              ? r.projector.site.address.trim() || null
              : null,
          projectorId: pid,
          serialNo: r.projector.serialNo,
          modelNo: r.projector.modelNo,
          periods: [],
        };
        projectorBuckets.set(pid, b);
      }
      b.periods.push({
        id: r.id,
        startDate: dOnly(r.startDate),
        endDate: dOnly(r.endDate),
        certificateNumber: r.certificateNumber,
      });
    }

    const withCycles = [...projectorBuckets.values()].map(
      (b) => ({
        projectorId: b.projectorId,
        serialNo: b.serialNo,
        modelNo: b.modelNo,
        periods: withAmcCycleNumbers(b.periods),
      }),
    );

    withCycles.sort((a, b) => a.serialNo.localeCompare(b.serialNo));

    const siteGroups = new Map<
      string,
      {
        siteId: string;
        siteName: string;
        siteAddress: string | null;
        projectors: (typeof withCycles)[number][];
      }
    >();

    for (const p of withCycles) {
      const b = projectorBuckets.get(p.projectorId)!;
      let g = siteGroups.get(b.siteId);
      if (!g) {
        g = {
          siteId: b.siteId,
          siteName: b.siteName,
          siteAddress: b.siteAddress,
          projectors: [],
        };
        siteGroups.set(b.siteId, g);
      }
      g.projectors.push(p);
    }

    const groups = [...siteGroups.values()].sort((a, b) => {
      const la = (a.siteAddress || a.siteName).toLowerCase();
      const lb = (b.siteAddress || b.siteName).toLowerCase();
      return la.localeCompare(lb);
    });

    return NextResponse.json({ groups });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "AMC search failed" }, { status: 500 });
  }
}
