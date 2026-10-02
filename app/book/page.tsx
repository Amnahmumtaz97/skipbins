import type { Metadata } from "next";
import { BookingPage } from "@/components/book/booking-page";

export const metadata: Metadata = {
  title: "Book Your Skip Bin | Premium Skip Bin Hire",
  description: "Book a skip bin with live pricing for Australian homes, renovations and businesses.",
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
      initialPickupDate={firstParam(params.pickup)}
      cancelled={firstParam(params.cancelled) === "1"}
    />
  );
}
