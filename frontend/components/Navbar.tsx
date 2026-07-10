"use client";

import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { navRoutes } from "@/lib/navigation";
import { withBase } from "@/lib/deployment";

/** Global top navigation. Renders from the central nav registry. */
export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
        <a href={withBase("/")} className="flex items-center gap-2">
          <Logo />
          <span className="text-lg font-semibold text-intel-dark">Intel-AI</span>
        </a>

        <ul className="ml-auto flex flex-wrap items-center gap-1">
          {navRoutes.map((route) => {
            const active = pathname === `/${route.slug}`;
            const className = `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-intel-haze text-intel-blue"
                : "text-gray-600 hover:bg-intel-haze/60 hover:text-intel-blue"
            }`;
            return (
              <li key={route.slug}>
                {/* Plain anchors are not auto-prefixed by Next's basePath, so
                    withBase() carries the deployment prefix. Full-page links
                    also keep the standalone BlueLens route working. The
                    trailing slash is omitted to avoid a prefix-dropping 308. */}
                <a
                  href={withBase(`/${route.slug}`)}
                  aria-current={active ? "page" : undefined}
                  className={className}
                >
                  {route.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
