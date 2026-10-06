import { PayoutManager } from "@/components/admin/payout-manager";
import { getPortalConfig } from "@/lib/server/portal-service";
import { getOperationsSnapshot } from "@/lib/server/operations-service";
import { todayIsoDate } from "@/lib/booking-utils";
export default async function Page() {
  const [config, snapshot] = await Promise.all([
    getPortalConfig(),
    getOperationsSnapshot(),
  ]);
  return (
    <PayoutManager
      bookings={snapshot.bookings}
      suppliers={snapshot.suppliers}
      today={todayIsoDate()}
      initialSettings={config.settings}
      ready={config.ready}
      error={config.error || snapshot.error}
    />
  );
}
