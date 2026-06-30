"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { withBase } from "@/lib/deployment";
import { inferenceNav, type InferenceNavItem } from "./content";

/** Returns true when the current pathname matches or is nested under href. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/inference") return pathname === "/inference";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TopLink({ item, pathname }: { item: InferenceNavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const className = `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? "bg-intel-blue/10 text-intel-blue"
      : "text-gray-600 hover:bg-intel-haze/60 hover:text-intel-blue"
  }`;
  return (
    <a href={withBase(item.href)} aria-current={active ? "page" : undefined} className={className}>
      {item.label}
    </a>
  );
}

function Dropdown({ item, pathname }: { item: InferenceNavItem; pathname: string }) {
  const [open, setOpen] = useState(false);
  const active = isActive(pathname, item.href);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "bg-intel-blue/10 text-intel-blue"
            : "text-gray-600 hover:bg-intel-haze/60 hover:text-intel-blue"
        }`}
      >
        {item.label}
        <span aria-hidden className="text-xs">▾</span>
      </button>
      {open && item.children && (
        <ul
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 min-w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {item.children.map((child) => {
            const childActive = isActive(pathname, child.href);
            return (
              <li key={child.href} role="none">
                <a
                  role="menuitem"
                  href={withBase(child.href)}
                  aria-current={childActive ? "page" : undefined}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    childActive
                      ? "bg-intel-haze text-intel-blue"
                      : "text-gray-600 hover:bg-intel-haze/60 hover:text-intel-blue"
                  }`}
                >
                  {child.label}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Secondary navigation for the Inference section, shown below the global navbar. */
export function InferenceSubNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-[57px] z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-6 py-2">
        {inferenceNav.map((item) =>
          item.children ? (
            <Dropdown key={item.href} item={item} pathname={pathname} />
          ) : (
            <TopLink key={item.href} item={item} pathname={pathname} />
          ),
        )}
      </nav>
    </div>
  );
}
