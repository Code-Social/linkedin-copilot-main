
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type MouseEvent, type ReactNode, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { confirmUnsavedChanges } from "@/lib/unsavedChanges";
import type { WorkspaceCounts } from "@/lib/types";
import { QuickIdea } from "./QuickIdea";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  primary?: boolean;
  countKey?: keyof WorkspaceCounts;
}

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "◎" },
  { href: "/ideas", label: "Ideas", icon: "◇", primary: true, countKey: "ideas" },
  { href: "/drafts", label: "Drafts", icon: "▤", primary: true, countKey: "drafts" },
  { href: "/calendar", label: "Calendar", icon: "▦" },
  { href: "/voice", label: "My Voice", icon: "◉" },
  { href: "/samples", label: "Writing Samples", icon: "❝" },
];

export function Shell({
  children,
  initialCounts = { ideas: 0, drafts: 0 },
}: {
  children: ReactNode;
  initialCounts?: WorkspaceCounts;
}) {
  const path = usePathname();
  const router = useRouter();
  const [quick, setQuick] = useState(false);
  const [menu, setMenu] = useState(false);
  const [counts, setCounts] = useState<WorkspaceCounts>(initialCounts);

  useEffect(() => {
    setCounts(initialCounts);
  }, [initialCounts]);

  useEffect(() => setMenu(false), [path]);

  const refreshCounts = () => {
    api<WorkspaceCounts>("/api/counts")
      .then((data) => {
        if (data) setCounts(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshCounts();
    window.addEventListener("focus", refreshCounts);
    window.addEventListener("workspace:refresh-counts", refreshCounts);

    return () => {
      window.removeEventListener("focus", refreshCounts);
      window.removeEventListener("workspace:refresh-counts", refreshCounts);
    };
  }, [path]);

  // "i" anywhere outside a text field opens quick add.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      if (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        event.metaKey ||
        event.ctrlKey
      ) {
        return;
      }

      if (event.key === "i") {
        event.preventDefault();
        setQuick(true);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Protect navigation from links in the workspace sidebar.
  const handleNavigationClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const link = event.currentTarget;

    if (link.target && link.target !== "_self") return;
    if (link.hasAttribute("download")) return;

    const destination = new URL(link.href, window.location.href);
    const current = new URL(window.location.href);

    if (destination.origin !== current.origin) return;

    if (
      destination.pathname === current.pathname &&
      destination.search === current.search &&
      destination.hash === current.hash
    ) {
      return;
    }

    if (!confirmUnsavedChanges()) {
      event.preventDefault();
    }
  };

  const active = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const count = item.countKey ? counts[item.countKey] : undefined;
        const isActive = active(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleNavigationClick}
            className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[14px] transition ${
              isActive
                ? "bg-paper-sunk font-medium text-ink"
                : "text-ink-soft hover:bg-paper-sunk/70 hover:text-ink"
            }`}
          >
            <span
              className={`w-4 text-center text-[13px] ${
                item.primary ? "text-accent" : "text-ink-faint"
              }`}
            >
              {item.icon}
            </span>

            <span className="flex-1 truncate">{item.label}</span>

            {typeof count === "number" && count > 0 && (
              <span
                title={
                  item.countKey === "ideas"
                    ? `${count} open idea${count === 1 ? "" : "s"}`
                    : `${count} active draft${count === 1 ? "" : "s"}`
                }
                className={`ml-auto inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums transition ${
                  isActive
                    ? "border border-line/80 bg-paper-raised text-ink shadow-xs"
                    : "bg-paper-sunk text-ink-soft group-hover:bg-paper-raised group-hover:text-ink"
                }`}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line px-3 py-5 md:flex">
        <Link
          href="/"
          onClick={handleNavigationClick}
          className="mb-6 flex items-center gap-2 px-2.5"
        >
          <img src="/icon.svg" alt="" className="h-6 w-6" />
          <span className="font-serif text-[17px]">LinkedIn Copilot</span>
        </Link>

        <button
          onClick={() => setQuick(true)}
          className="mb-4 flex items-center justify-between rounded-lg border border-line bg-paper-raised px-2.5 py-2 text-sm text-ink-soft shadow-sm transition hover:text-ink"
        >
          <span>+ Quick idea</span>
          <kbd className="rounded border border-line px-1.5 text-[11px] text-ink-faint">
            i
          </kbd>
        </button>

        {nav}

        <div className="mt-auto px-2.5 text-xs text-ink-faint">
          Private workspace
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur md:hidden">
        <button
          onClick={() => setMenu((value) => !value)}
          className="text-sm"
          aria-label="Menu"
        >
          ☰ <span className="font-serif text-base">LinkedIn Copilot</span>
        </button>

        <button
          onClick={() => setQuick(true)}
          className="rounded-lg border border-line px-2.5 py-1 text-sm"
        >
          + Idea
        </button>
      </header>

      {menu && (
        <div className="border-b border-line bg-paper px-3 py-3 md:hidden">
          {nav}
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      <QuickIdea
        open={quick}
        onClose={() => setQuick(false)}
        onSaved={() => {
          setQuick(false);
          refreshCounts();
          router.refresh();
        }}
      />
    </div>
  );
}
