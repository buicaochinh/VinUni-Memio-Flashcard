import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import ThemeProvider from "../components/ThemeProvider";
import "./globals.css";

const jakarta = localFont({
  src: [
    {
      path: "./fonts/PlusJakartaSans-Variable.ttf",
      weight: "400 800",
      style: "normal",
    },
    {
      path: "./fonts/PlusJakartaSans-Italic-Variable.ttf",
      weight: "400 800",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Memio — Học thông minh hơn",
  description: "Nền tảng học tập tối giản, tạo flashcards bằng AI và ôn tập thông minh.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={jakarta.variable} suppressHydrationWarning>
      <head>
        {/* Google Identity Services (GIS) for Google Sign-In loaded with lazyOnload for performance */}
        <Script 
          src="https://accounts.google.com/gsi/client" 
          strategy="afterInteractive"
        />
      </head>
      <body className="antialiased font-sans" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
