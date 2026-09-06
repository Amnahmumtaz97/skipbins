import { CircleAlert } from "lucide-react";

export function ValidationMessage({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <span className="mt-1.5 flex items-start gap-1.5 text-xs font-bold text-red-600">
      <CircleAlert size={14} className="mt-px shrink-0" />
      {message}
    </span>
  );
}
