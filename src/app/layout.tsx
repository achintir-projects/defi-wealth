import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import ErrorBoundary from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeFi Wealth Manager",
  description: "Professional DeFi portfolio management and wealth tracking application with secure admin controls.",
  keywords: ["DeFi", "cryptocurrency", "portfolio", "wealth management", "Bitcoin", "Ethereum", "blockchain"],
  authors: [{ name: "DeFi Wealth Manager Team" }],
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "DeFi Wealth Manager",
    description: "Professional DeFi portfolio management and wealth tracking application",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DeFi Wealth Manager",
    description: "Professional DeFi portfolio management and wealth tracking application",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
