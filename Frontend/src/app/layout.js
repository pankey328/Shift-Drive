import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ReduxProvider from "@/redux/Providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata = {
  title: "ShiftDrive | Enterprise Self-Drive Car Rentals & Mobility",
  description:
    "Instant booking, 2-hour safety buffer sanitization, contactless digital inspections, and one-way airport car rentals.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${outfit.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-neutral-950 text-white selection:bg-emerald-500 selection:text-black font-sans">
        <ReduxProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ReduxProvider>
      </body>
    </html>
  );
}

