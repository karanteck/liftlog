import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StrongBoi",
  description: "Workout tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StrongBoi",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground font-sans">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
