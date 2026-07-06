import type { Metadata } from "next";
import { Lora, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import ActiveSessionBar from "@/components/ActiveSessionBar";

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tear | AI Product Teardowns",
  description:
    "AI agents crawl dozens of sources and assemble a citation-backed teardown so you understand any product deeply, in minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${lora.variable} ${dmSans.variable} ${ibmPlexMono.variable}`}>
      <body className="font-dm-sans antialiased bg-tear-bg text-tear-text">
        {children}
        <ActiveSessionBar />
      </body>
    </html>
  );
}
