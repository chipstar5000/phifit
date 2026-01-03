import type { Metadata, Viewport } from "next";
import "./globals.css";
import ToastProvider from "@/components/toast-provider";

export const metadata: Metadata = {
  title: "PhiFit - Fitness Challenge",
  description: "Mobile-first fitness challenge app for friends",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
