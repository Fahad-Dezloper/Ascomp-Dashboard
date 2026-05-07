import DashboardPageShell from "@/components/admin/dashboard-page-shell";
import AmcSearchView from "@/components/admin/amc-search-view";

const breadcrumbs = [
  { label: "Home", href: "/admin/dashboard/overview" },
  { label: "AMC lookup" },
];

export default function AmcSearchPage() {
  return (
    <DashboardPageShell breadcrumbs={breadcrumbs}>
      <div className="p-6">
        <AmcSearchView />
      </div>
    </DashboardPageShell>
  );
}
