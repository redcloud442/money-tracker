"use client";

import { useEffect } from "react";

export default function ActivityTracker() {
  useEffect(() => {
    localStorage.setItem(
      "money-tracker-last-activity",
      new Date().toISOString()
    );
  }, []);

  return null;
}
