import ServiceWorkerRegistration from "@/components/PWA/ServiceWorkerRegistration";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import { Notifications } from "@mantine/notifications";
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#228be6",
};

export const metadata: Metadata = {
  title: "Money Tracker - Master Your Finances",
  description:
    "Track your income, expenses, and savings with our free money tracking app",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Money Tracker",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.variable} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body>
        <MantineProvider defaultColorScheme="auto">
          <Notifications />
          <ServiceWorkerRegistration />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
