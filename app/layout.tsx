import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import LocaleProvider from "@/components/LocaleProvider";
import LanguageToggle from "@/components/LanguageToggle";

export const metadata: Metadata = {
  formatDetection: { telephone: false, date: false, email: false, address: false },
  title: "Pulse Analytics — Live Product Metrics Dashboard",
  description:
    "Monitor your SaaS product in real time. KPI cards, live charts, and detailed analytics — all in one glass-futuristic dashboard.",
  openGraph: {
    title: "Pulse Analytics — Live Product Metrics Dashboard",
    description:
      "Monitor your SaaS product in real time. KPI cards, live charts, and detailed analytics.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[var(--background)] text-[var(--foreground)] font-sans antialiased min-h-screen">
        <LocaleProvider>
          <LanguageToggle />
          <Navbar />
          <main className="flex min-h-screen">
            {children}
          </main>
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}