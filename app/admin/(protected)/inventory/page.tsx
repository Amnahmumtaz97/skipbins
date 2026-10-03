import { InventoryTable } from "@/components/admin/inventory-table";
import { bins } from "@/lib/data/skip-bins";
import { getOperationsSnapshot } from "@/lib/server/operations-service";

export default async function AdminInventoryPage() {
  const { bookings, suppliers } = await getOperationsSnapshot();
  const rows = bins.map((bin) => {
    const stock = suppliers.reduce((sum, supplier) => sum + Number(supplier.bin_inventory[bin.id] ?? 0), 0);
    const committed = bookings.filter((booking) => booking.bin_size === bin.id && ["assigned", "accepted", "scheduled", "delivered", "collection_due"].includes(booking.operation_status)).length;
    return { id: bin.id, size: bin.size, door: bin.door, dimensions: bin.dimensions, stock, committed, available: Math.max(0, stock - committed) };
  });

  return <div className="mx-auto max-w-[1400px]"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#65A30D]">Supply management</p><h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.04em] text-[#0B3B24]">Bin availability</h1><p className="mt-2 text-[13px] text-[#66746B]">Network stock compared with bins currently assigned or on hire.</p>
    <div className="mt-6"><InventoryTable rows={rows} /></div>
    <p className="mt-5 rounded-xl bg-[#EAF4DF] px-4 py-3 text-[11px] leading-5 text-[#315B28]">Inventory is the total entered against active suppliers. Assigned, scheduled, delivered and collection-due orders count as committed stock.</p>
  </div>;
}
