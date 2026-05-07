export type SiteDirectorySearchShape = {
  name: string;
  address?: string;
  location?: string;
  contactDetails?: string;
  siteCode?: string | null;
  email?: string | null;
  projectors: Array<{
    name?: string;
    model?: string;
    serialNumber?: string;
    address?: string | null;
    region?: string | null;
    state?: string | null;
  }>;
};
