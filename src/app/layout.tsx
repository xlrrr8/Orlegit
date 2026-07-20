import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "ORlegit — AI-Powered Scam Verification Platform",
  description:
    "Verify if something is a scam or genuine using community reports and AI-powered analysis. Search URLs, phone numbers, messages, and more.",
  keywords: ["scam verification", "scam checker", "fraud detection", "AI scam detection"],
  openGraph: {
    title: "ORlegit",
    description: "Community-driven + AI-powered scam verification",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
          <MobileNav />
        </AuthProvider>
      </body>
    </html>
  );
}
