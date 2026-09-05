"use client";

import { useEffect } from "react";

export function useAutoAdvance(onAdvance: () => void, intervalMs: number) {
  useEffect(() => {
    const timer = window.setInterval(onAdvance, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, onAdvance]);
}
