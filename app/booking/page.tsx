import type { Metadata } from "next";
import { BookingPage } from "@/components/book/booking-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Book Skip Bin Hire Melbourne",
  description:
    "Book skip bin hire online in Melbourne with live pricing. Free delivery and pickup for homes, renovations and businesses across Victoria.",
  path: "/booking",
  keywords: [
    "book skip bin Melbourne",
    "skip bin hire Melbourne",
    "online skip bin booking",
    "affordable skip bin hire",
    "rubbish removal bin hire",
  ],
});

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BookingRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  return (
    <BookingPage
      initialSize={firstParam(params.size)}
      initialLocation={firstParam(params.location)}
      initialLocationLabel={firstParam(params.locationLabel)}
      initialStreetAddress={firstParam(params.streetAddress)}
      initialDeliveryAddressLabel={firstParam(params.deliveryAddressLabel)}
      initialWaste={firstParam(params.waste)}
      initialDate={firstParam(params.date)}
      initialPickupDate={firstParam(params.pickup)}
      cancelled={firstParam(params.cancelled) === "1"}
    />
  );
}
