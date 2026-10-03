export const operationStatuses = [
  "payment_pending",
  "unassigned",
  "assigned",
  "accepted",
  "scheduled",
  "delivered",
  "collection_due",
  "collected",
  "cancelled",
  "issue",
] as const;

export type OperationStatus = (typeof operationStatuses)[number];

export const operationStatusLabels: Record<OperationStatus, string> = {
  payment_pending: "Payment pending",
  unassigned: "Needs supplier",
  assigned: "Assigned",
  accepted: "Accepted",
  scheduled: "Scheduled",
  delivered: "On hire",
  collection_due: "Collection due",
  collected: "Completed",
  cancelled: "Cancelled",
  issue: "Needs attention",
};

export const supplierActionStatuses: OperationStatus[] = [
  "accepted",
  "scheduled",
  "delivered",
  "collection_due",
  "collected",
  "issue",
];

export function isOperationStatus(value: unknown): value is OperationStatus {
  return typeof value === "string" && operationStatuses.includes(value as OperationStatus);
}

export function operationStatusTone(status: OperationStatus) {
  if (status === "collected") return "bg-[#E7F4E2] text-[#2F6B24]";
  if (status === "issue" || status === "cancelled") return "bg-[#FDE9E5] text-[#9B3528]";
  if (status === "unassigned" || status === "collection_due") return "bg-[#FFF1D6] text-[#8A5700]";
  if (status === "payment_pending") return "bg-[#EEEAF8] text-[#5D4688]";
  return "bg-[#E7F1F7] text-[#245A78]";
}
