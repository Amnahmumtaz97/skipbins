"use client";

import { useEffect } from "react";
import { markSuccessForBackNavigation } from "@/lib/booking-draft";

export function SuccessBackNavigation() {
  useEffect(() => {
    markSuccessForBackNavigation();
    const onPopState = () => {
      if (window.location.pathname === "/checkout") {
        window.location.replace("/booking");
      }
    };
    window.addEventListener("popstate", onPopState, true);
    return () => window.removeEventListener("popstate", onPopState, true);
  }, []);

  return null;
}
