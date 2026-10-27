import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { DataProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tracker",
  description: "Onboarding, attendance and work tracker for GoTyme",
  appleWebApp: { capable: true, title: "Tracker", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#EEF0F6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={GeistSans.className}>
        <DataProvider>{children}</DataProvider>
      </body>
    </html>
  );
}
