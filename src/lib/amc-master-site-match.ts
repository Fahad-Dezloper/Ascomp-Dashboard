/**
 * AMC “site box” helper: projector IDs whose linked site + projector master data
 * match free text (normalized), same behavior as Sites & Projectors directory search.
 */

import prisma from "@/lib/db";
import {
  haystackMatchesFreeTextQuery,
  normalizeForSearch,
} from "@/lib/site-free-text-search";

export async function getProjectorIdsMatchingMasterSiteFreeText(
  rawQuery: string,
): Promise<string[]> {
  if (!normalizeForSearch(rawQuery)) return [];

  const rows = await prisma.projector.findMany({
    select: {
      id: true,
      serialNo: true,
      modelNo: true,
      address: true,
      region: true,
      state: true,
      site: {
        select: {
          siteName: true,
          address: true,
          contactDetails: true,
          siteCode: true,
          email: true,
        },
      },
    },
  });

  const ids: string[] = [];
  for (const r of rows) {
    const parts = [
      r.site.siteName,
      r.site.address,
      r.site.contactDetails,
      r.site.siteCode,
      r.site.email,
      r.serialNo,
      r.modelNo,
      r.address,
      r.region,
      r.state,
    ];
    if (haystackMatchesFreeTextQuery(parts, rawQuery)) {
      ids.push(r.id);
    }
  }
  return ids;
}
