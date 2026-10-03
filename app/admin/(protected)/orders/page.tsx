import { OrderManager } from "@/components/admin/order-manager";
import { getOperationsSnapshot } from "@/lib/server/operations-service";

export default async function AdminOrdersPage() {
  const { bookings, suppliers } = await getOperationsSnapshot();
  return <div className="mx-auto max-w-[1500px]"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#65A30D]">Dispatch board</p><h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.04em] text-[#0B3B24]">Orders</h1><p className="mt-2 text-[13px] text-[#66746B]">Assign suppliers and move each order from payment to collection.</p><div className="mt-6"><OrderManager initialBookings={bookings} suppliers={suppliers} /></div></div>;
}
