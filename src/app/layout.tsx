import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

// Strict Enterprise Sans-Serif Font Setup (Inter)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "School ERP - Enterprise Academic Management System",
  description: "Enterprise-Grade School ERP Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-50 text-slate-900`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
