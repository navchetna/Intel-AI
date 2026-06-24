"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { navRoutes } from "@/lib/navigation";

/** Global top navigation. Renders from the central nav registry. */
export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-lg font-semibold text-intel-dark">Intel-AI</span>
        </Link>

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
                {route.external ? (
                  // Served by a separate container (proxied). Use a full-page
                  // load so the external SPA boots correctly.
                  <a href={`/${route.slug}/`} className={className}>
                    {route.label}
                  </a>
                ) : (
                  <Link
                    href={`/${route.slug}`}
                    aria-current={active ? "page" : undefined}
                    className={className}
                  >
                    {route.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
