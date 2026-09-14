import { requireDistrictAuthority } from "@/lib/auth/permissions";
import {
  getDistrictAuthorityCommandDataAction,
  listPendingApprovals,
} from "@/lib/actions/authority";
import { DistrictCommandCenter } from "@/components/authority/DistrictCommandCenter";

export default async function AuthorityDashboardPage() {
  await requireDistrictAuthority();

  const [initialData, pendingApprovals] = await Promise.all([
    getDistrictAuthorityCommandDataAction({ timeRange: "30d" }),
    listPendingApprovals(),
  ]);

  return (
    <div className="text-[#191F1C] dark:text-[#F4EEE1]">
      <DistrictCommandCenter
        initialData={initialData}
        pendingApprovalsCount={pendingApprovals.length}
      />
    </div>
  );
}
