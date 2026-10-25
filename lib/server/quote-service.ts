import {
  acceptedWaste,
  bins,
  hirePeriods,
  isWasteAllowedForBin,
} from "@/lib/data/skip-bins";
import { isResolvedPostcode, postcodeSelectionError } from "@/lib/postcode";
import { InputError } from "@/lib/server/request";
import {
  addDaysIso,
  hireForDates,
  standardPickupDate,
  todayIsoDate,
} from "@/lib/booking-utils";
import { hireExtensionAmount } from "@/lib/pricing";
import { isIsoDate, rateForDate } from "@/lib/admin-config";
import { getPortalConfig } from "@/lib/server/portal-service";
import { victorianLocalities } from "@/lib/server/victorian-localities";
import { adminDatabase } from "@/lib/server/admin-database";
import { bookablePostcodes } from "@/lib/server/supplier-coverage";
export function validateQuote(data: Record<string, unknown>) {
  if (!isResolvedPostcode(data.postcode))
    throw new InputError(postcodeSelectionError);
  if (!bins.some((b) => b.id === data.size))
    throw new InputError("Please select a bin size.");
  if (!acceptedWaste.some((w) => w.id === data.waste))
    throw new InputError("Please select a waste type.");
  if (!isWasteAllowedForBin(data.size as string, data.waste as string))
    throw new InputError(
      "This bin cannot be used for the selected waste type.",
    );
  if (
    data.date !== undefined &&
    (!isIsoDate(data.date) || data.date < addDaysIso(todayIsoDate(), 1))
  )
    throw new InputError("Please select a valid future delivery date.");
  if (
    data.pickupDate !== undefined &&
    (!isIsoDate(data.pickupDate) ||
      typeof data.date !== "string" ||
      !hireForDates(data.date, data.pickupDate))
  )
    throw new InputError(
      "Pickup must be from the delivery date, up to 24 days later.",
    );
  if (
    data.hirePeriod !== undefined &&
    !hirePeriods.some((p) => p === data.hirePeriod)
  )
    throw new InputError("Please select a rental period.");
  if (
    typeof data.date === "string" &&
    typeof data.pickupDate === "string" &&
    typeof data.hirePeriod === "string" &&
    data.hirePeriod !==
      hireForDates(data.date, data.pickupDate)?.period
  )
    throw new InputError(
      "Please select the rental period that matches your pickup date.",
    );
  const locationLabel =
    typeof data.locationLabel === "string" ? data.locationLabel : "";
  const suburb = locationLabel
    .match(/^(.+),\s*VIC\s+\d{4}$/i)?.[1]
    ?.trim()
    .toUpperCase();
  return {
    postcode: data.postcode,
    size: data.size as string,
    waste: data.waste as string,
    date: data.date as string | undefined,
    pickupDate: data.pickupDate as string | undefined,
    hirePeriod: data.hirePeriod as string | undefined,
    suburb,
  };
}
export async function lookupQuote(
  input: ReturnType<typeof validateQuote>,
): Promise<{ serviceable: boolean; total: number | null }> {
  const [localities, config] = await Promise.all([
    victorianLocalities(input.postcode),
    getPortalConfig(),
  ]);
  const locality = localities.find(
    (l) =>
      l.postcode === input.postcode &&
      (!input.suburb || l.suburb === input.suburb),
  );
  if (!locality)
    throw new InputError(
      "We only service verified Victorian suburbs and postcodes.",
    );
  if (!config.ready) throw new Error("Booking configuration unavailable");
  const { settings, rates } = config;
  if (!input.suburb)
    throw new InputError("Select a Victorian suburb from the suggestions.");
  const covered = await bookablePostcodes();
  if (!covered?.includes(input.postcode))
    throw new InputError("Delivery is not available in this Victorian suburb.");
  const rate = rates.find(
    (r) => r.binId === input.size && r.wasteId === input.waste,
  );
  if (!rate)
    throw new InputError(
      "Pricing is not available for this bin and waste type.",
    );
  const result = rateForDate(rate, input.date);
  if (!result.available)
    throw new InputError(
      "This bin is not available for the selected delivery date.",
    );
  if (input.date) {
    if (
      settings.blockedDates.some(
        (r) => r.start <= input.date! && r.end >= input.date!,
      )
    )
      throw new InputError(
        "Deliveries are unavailable on this date. Please choose another date.",
      );
    for (const date of [input.date, input.pickupDate].filter(
      Boolean,
    ) as string[]) {
      const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
      if (!settings.profile.hours[weekday]?.open)
        throw new InputError(
          "We are closed on a selected service date. Please choose another date.",
        );
    }
    if (rate.stock !== null) {
      const db = adminDatabase();
      if (!db) throw new Error("Availability unavailable");
      const end = addDaysIso(
        input.pickupDate ?? standardPickupDate(input.date),
        rate.turnaround,
      );
      const { data, error } = await db
        .from("bookings")
        .select(
          "delivery_date,pickup_date,status,reserved_until,booking_turnaround",
        )
        .eq("bin_size", input.size)
        .neq("operation_status", "cancelled")
        .not("operation_status", "like", "deleted%")
        .lte("delivery_date", end)
        .gte("pickup_date", addDaysIso(input.date, -30));
      if (error) throw error;
      const occupied = (data ?? []).filter(
        (b) =>
          b.status === "paid" ||
          (b.status === "pending" &&
            b.reserved_until &&
            new Date(b.reserved_until).getTime() > Date.now()),
      );
      let peak = 0;
      for (let day = input.date; day <= end; day = addDaysIso(day, 1)) {
        const count = occupied.filter(
          (b) =>
            b.delivery_date <= day &&
            addDaysIso(b.pickup_date, b.booking_turnaround ?? 1) >= day,
        ).length;
        peak = Math.max(peak, count);
      }
      if (peak >= rate.stock)
        throw new InputError(
          "This bin is fully booked for those dates. Choose another size or date.",
        );
    }
  }
  const extension =
    input.date && input.pickupDate
      ? hireForDates(input.date, input.pickupDate)
      : null;
  const fee = extension ? extension.fee : hireExtensionAmount(input.hirePeriod);
  const total = Math.round((result.price + fee) * 100) / 100;
  if (total <= 0)
    throw new InputError("This bin does not have a valid booking price.");
  return { serviceable: true, total };
}
