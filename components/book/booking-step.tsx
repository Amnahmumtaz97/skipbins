import type { ReactNode } from "react";

export function BookingStep({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#e4e8dc] bg-white p-5 shadow-[0_10px_24px_rgba(11,59,36,0.06)] sm:p-7">
      <h2 className="text-2xl font-black tracking-[-0.03em] text-[#0B3B24]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#405347]">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
