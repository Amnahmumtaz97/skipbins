import { getPortalConfig } from "@/lib/server/portal-service";
export async function GET() {
  const config = await getPortalConfig();
  if (!config.ready)
    return Response.json(
      { error: "Availability is temporarily unavailable." },
      { status: 503 },
    );
  return Response.json(
    {
      closedWeekdays: config.settings.profile.hours.flatMap((h, i) =>
        h.open ? [] : [(i + 1) % 7],
      ),
      blockedDates: config.settings.blockedDates.map((r) => ({
        start: r.start,
        end: r.end,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
