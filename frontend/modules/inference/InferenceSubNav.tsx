"use client";

import { usePathname } from "next/navigation";
import { withBase } from "@/lib/deployment";
import { inferenceNav } from "./content";

/** Returns true when the current pathname matches or is nested under href. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/inference") return pathname === "/inference";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Secondary navigation for the Inference section, shown below the global navbar. */
export function InferenceSubNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-[57px] z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-6 py-2">
        {inferenceNav.map((item) => {
          const active = isActive(pathname, item.href);
          const className = `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            active
              ? "bg-intel-blue/10 text-intel-blue"
              : "text-gray-600 hover:bg-intel-haze/60 hover:text-intel-blue"
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
