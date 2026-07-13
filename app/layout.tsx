import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "./providers";

export const metadata: Metadata = {
  title: "Pavrix — AI Sales Intelligence Platform",
  description:
    "Discover, qualify and contact high-quality wholesale buyers in minutes. AI-powered B2B sales intelligence for distributors.",
  keywords: ["wholesale", "B2B", "sales intelligence", "lead generation", "buyers"],
  openGraph: {
    title: "Pavrix — AI Sales Intelligence Platform",
    description: "Find your next wholesale buyers using AI. Powered by deterministic scoring and LLM insights.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
