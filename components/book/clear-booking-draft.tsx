"use client";

import { useEffect } from "react";
import { clearBookingDraft } from "@/lib/booking-draft";

export function ClearBookingDraft() {
  useEffect(() => {
    clearBookingDraft();
  }, []);
  return null;
}
