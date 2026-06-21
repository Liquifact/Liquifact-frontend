import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "../components/Footer";
import { ToastProvider } from "../components/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "LiquiFact — Global Invoice Liquidity on Stellar",
  description: "Tokenized invoice financing for SMEs. Unlock liquidity from unpaid invoices on the Stellar network.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <ToastProvider>
          {children}
        </ToastProvider>
        <Footer />
      </body>
    </html>
  );
}
