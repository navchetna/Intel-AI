import type { Metadata } from "next";
import { settings } from "@/config/settings";
import { Navbar } from "@/components/Navbar";
import { VisitorCounter } from "@/components/VisitorCounter";
import { ThemeProvider } from "@/contexts/ThemeContext";
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
        <ThemeProvider>
          <Navbar />
          {children}
          {/* Visitor counter — fixed bottom-right pill */}
          <div className="fixed bottom-5 right-5 z-50">
            <VisitorCounter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
