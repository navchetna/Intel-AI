"use client";

import { usePathname } from "next/navigation";
import { withBase } from "@/lib/deployment";
import { agenticNav } from "./content";

/** Returns true when the current pathname matches or is nested under href. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/agentic-ai") return pathname === "/agentic-ai";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Secondary navigation for the Agentic AI section, shown below the global navbar. */
export function AgenticSubNav() {
  const pathname = usePathname();

  if (agenticNav.length < 2) return null;

  return (
    <div
      className="sticky top-[57px] z-40 border-b backdrop-blur"
      style={{ background: "var(--dm-nav-bg)", borderColor: "var(--dm-nav-border)" }}
    >
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-6 py-2">
        {agenticNav.map((item) => {
          const active = isActive(pathname, item.href);
          const className = `nav-link rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            active ? "nav-link-active" : ""
          }`;
          return (
            <a
              key={item.href}
              href={withBase(item.href)}
              aria-current={active ? "page" : undefined}
              className={className}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
