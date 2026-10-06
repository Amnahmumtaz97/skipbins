import { CustomerManager } from "@/components/admin/customer-manager";
import { listCustomers } from "@/lib/server/portal-service";
import { getOperationsSnapshot } from "@/lib/server/operations-service";
import { todayIsoDate } from "@/lib/booking-utils";
export default async function Page() {
  const [customers, snapshot] = await Promise.all([
    listCustomers(),
    getOperationsSnapshot(),
  ]);
  return (
    <CustomerManager
      initialCustomers={customers.customers}
      bookings={snapshot.bookings}
      error={customers.error || snapshot.error}
      today={todayIsoDate()}
    />
  );
}
