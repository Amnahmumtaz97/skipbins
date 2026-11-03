import type { Metadata } from "next";
import { BookingPage } from "@/components/book/booking-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Book a Skip Bin Online Melbourne",
    description:
      "Get an instant skip bin hire quote for Melbourne and book online. Choose bin size, waste type and delivery date with free delivery and pickup.",
    path: "/booking",
    keywords: [
      "book skip bin Melbourne",
      "skip bin hire quote",
      "online skip bin booking",
      "skip bin delivery Melbourne",
      "cheap skip bin hire Melbourne",
    ],
  }),
  // Prefer /booking as the public booking URL (home CTA uses it).
  alternates: { canonical: "/booking" },
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({ searchParams }: PageProps<"/book">) {
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
      initialPickupDate={firstParam(params.pickupDate) ?? firstParam(params.pickup)}
      cancelled={firstParam(params.cancelled) === "1"}
    />
  );
}
