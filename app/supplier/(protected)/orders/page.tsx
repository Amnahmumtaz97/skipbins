import { SupplierOrders } from "@/components/supplier/supplier-orders";
import { supplierIdFromUser } from "@/lib/server/admin-auth";
import { getSupplierOperations } from "@/lib/server/operations-service";
import { createClient } from "@/lib/supabase/server";

export default async function SupplierOrdersPage() { const { data: { user } } = await (await createClient()).auth.getUser(); const { bookings } = await getSupplierOperations(user!.id, supplierIdFromUser(user)); return <div className="mx-auto max-w-[1300px]"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#65A30D]">Job register</p><h1 className="mt-1 text-[30px] font-extrabold tracking-[-.04em] text-[#0B3B24]">Assigned orders</h1><p className="mt-2 text-[12px] text-[#66746B]">Delivery, on-hire and collection work assigned to your business.</p><div className="mt-6"><SupplierOrders initialBookings={bookings} /></div></div>; }
