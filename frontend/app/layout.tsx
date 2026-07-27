import type { Metadata } from "next";
import { settings } from "@/config/settings";
import { Navbar } from "@/components/Navbar";
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { VisitorCounter } from "@/components/VisitorCounter";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NavSettingsProvider } from "@/contexts/NavSettingsContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import "./globals.css";

export const metadata: Metadata = {
  title: settings.appName,
  description: "Intel-AI modular full-stack boilerplate",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          // Runs before paint so a stored "light" preference doesn't flash dark first.
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("intel-ai-theme")==="light")document.documentElement.setAttribute("data-theme","light");}catch(e){}`,
          }}
        />
        <ThemeProvider>
          <NavSettingsProvider>
            <ProjectProvider>
              <Navbar />
              <div className="flex items-stretch">
                <ProjectSidebar />
                <div className="flex-1 min-w-0">{children}</div>
              </div>
              {/* Visitor counter — fixed bottom-right pill */}
              <div className="fixed bottom-5 right-5 z-50">
                <VisitorCounter />
              </div>
            </ProjectProvider>
          </NavSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
