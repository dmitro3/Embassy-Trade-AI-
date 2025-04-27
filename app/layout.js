// Server part (no use client directive)
import { Geist, Geist_Mono } from "next/font/google";
import "./styles.css"; // Using our new CSS file instead of globals.css

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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
