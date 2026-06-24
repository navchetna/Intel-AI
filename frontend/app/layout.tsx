import type { Metadata } from "next";
import { settings } from "@/config/settings";
import { Navbar } from "@/components/Navbar";
import { VisitorCounter } from "@/components/VisitorCounter";
import "./globals.css";

export const metadata: Metadata = {
  title: settings.appName,
  description: "Intel-AI modular full-stack boilerplate",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
        <footer className="border-t border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <span className="text-sm text-gray-400">{settings.appName}</span>
            <VisitorCounter />
          </div>
        </footer>
      </body>
    </html>
  );
}
