import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BusTrack – Ahmedabad BRTS Live Tracking",
  description:
    "Real-time bus tracking, ride-hailing, and fleet management for Ahmedabad BRTS. Live GPS for passengers, drivers, and administrators.",
  keywords: ["bus tracking", "BRTS", "Ahmedabad", "public transit", "live GPS"],
};

import Providers from "@/components/Providers";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-brand-dark text-white antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
