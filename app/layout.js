// Server part (no use client directive)
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// This metadata export needs to be in a server component
export const metadata = {
  title: "Embassy Trade - AI-Powered Trading",
  description: "Next-generation trading platform powered by AI",
  icons: {
    icon: '/favicon.ico',
  },
};

// Client part
import ClientLayout from "./client-layout";
import Link from "next/link";
import EmbassyLogo from "@/components/EmbassyLogo";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Navigation bar */}
        <nav className="bg-gray-900 shadow-lg border-b border-gray-800">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <EmbassyLogo size="md" withText={true} />
              </div>
              <div className="flex space-x-4">
                <Link href="/" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Home
                </Link>
                <Link href="/simulation" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Simulation
                </Link>
                <Link href="/arcade" className="text-gray-300 hover:bg-blue-900/30 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  $kill some time$
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
