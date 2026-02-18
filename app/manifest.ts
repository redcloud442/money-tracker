import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Money Tracker",
    short_name: "MoneyTracker",
    description:
      "Track your income, expenses, and savings with our free money tracking app",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#228be6",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
