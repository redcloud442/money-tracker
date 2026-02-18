"use client";

import { useEffect } from "react";

const INACTIVITY_THRESHOLD_DAYS = 3;
const NOTIFICATION_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("SW registration failed:", err);
    });

    checkInactivity();
  }, []);

  return null;
}

function checkInactivity() {
  const lastActivity = localStorage.getItem("money-tracker-last-activity");
  const lastNotification = localStorage.getItem(
    "money-tracker-last-notification"
  );

  // First visit — just record the timestamp, don't notify
  if (!lastActivity) {
    localStorage.setItem(
      "money-tracker-last-activity",
      new Date().toISOString()
    );
    return;
  }

  const daysSinceActivity = Math.floor(
    (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceActivity < INACTIVITY_THRESHOLD_DAYS) {
    return;
  }

  // Check notification cooldown
  if (lastNotification) {
    const timeSinceNotification =
      Date.now() - new Date(lastNotification).getTime();
    if (timeSinceNotification < NOTIFICATION_COOLDOWN_MS) {
      return;
    }
  }

  // Only proceed if permission is not denied
  if (!("Notification" in window) || Notification.permission === "denied") {
    return;
  }

  if (Notification.permission === "default") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        showInactivityNotification(daysSinceActivity);
      }
    });
  } else if (Notification.permission === "granted") {
    showInactivityNotification(daysSinceActivity);
  }
}

function showInactivityNotification(days: number) {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.ready.then((registration) => {
    registration.showNotification("Money Tracker", {
      body: `It's been ${days} day${days !== 1 ? "s" : ""} since your last transaction. Time to log your spending!`,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      tag: "inactivity-reminder",
    });

    localStorage.setItem(
      "money-tracker-last-notification",
      new Date().toISOString()
    );
  });
}
