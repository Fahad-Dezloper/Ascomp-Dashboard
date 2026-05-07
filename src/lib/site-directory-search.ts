/**
 * Site + projector directory search — aligns with AMC site box (`haystackMatchesFreeTextQuery`).
 */

import type { SiteDirectorySearchShape } from "@/lib/site-directory-search-shape";
export type { SiteDirectorySearchShape } from "@/lib/site-directory-search-shape";

import { haystackMatchesFreeTextQuery } from "@/lib/site-free-text-search";

function collectParts(site: SiteDirectorySearchShape): Array<string | null | undefined> {
  const raw: Array<string | null | undefined> = [
    site.name,
    site.address,
    site.location,
    site.contactDetails,
    site.siteCode ?? undefined,
    site.email ?? undefined,
  ];
  for (const p of site.projectors ?? []) {
    raw.push(
      p.name,
      p.model,
      p.serialNumber,
      p.address ?? undefined,
      p.region ?? undefined,
      p.state ?? undefined,
    );
  }
  return raw;
}

export function matchesSitesDirectorySearch(
  rawQuery: string,
  site: SiteDirectorySearchShape,
): boolean {
  return haystackMatchesFreeTextQuery(collectParts(site), rawQuery);
}
