import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PwaProvider } from "@/components/providers/pwa-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AWorkApp — Job Application Tracker",
    template: "%s | AWorkApp",
  },
  description:
    "Track every job application, resume version, timeline event, and submitted document in one secure place.",
  robots: {
    index: false, // Private app — no indexing
    follow: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AWorkApp",
  },
};

export const viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider defaultTheme="system" storageKey="aos-theme">
          <AuthProvider>
            <TooltipProvider>
              <PwaProvider>
                {children}
                <Toaster position="top-right" richColors />
              </PwaProvider>
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
