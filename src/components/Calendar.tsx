"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api, ymd } from "@/lib/client";
import type { Draft, Idea } from "@/lib/types";

type Item = {
  id: string;
  kind: "idea" | "draft";
  title: string;
  status: string;
  category: string | null;
  date: string | null;
  href: string;
};

const STYLE: Record<string, string> = {
  idea: "bg-paper-sunk text-ink-soft",
  drafting: "bg-sky-50 text-sky-900 ring-1 ring-sky-100",
  needs_work: "bg-orange-50 text-orange-900 ring-1 ring-orange-100",
  ready: "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-100",
  posted: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100",
};
const LEGEND = [
  ["idea", "💭 Idea"],
  ["drafting", "✍️ Draft"],
  ["needs_work", "🔄 Needs work"],
  ["ready", "📅 Ready"],
  ["posted", "✅ Published"],
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Calendar({ ideas, drafts, sampleTopics }: { ideas: Idea[]; drafts: Draft[]; sampleTopics: { topic: string | null; date: string | null }[] }) {
  const router = useRouter();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [over, setOver] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, string | null>>({});

  const items: Item[] = useMemo(() => {
    const draftIdeaIds = new Set(drafts.map((d) => d.ideaId).filter(Boolean));
    const all: Item[] = [
      ...drafts
        .filter((d) => d.status !== "archived")
        .map((d) => ({
          id: d.id,
          kind: "draft" as const,
          title: d.title,
          status: d.status,
          category: d.category,
          date: d.status === "posted" ? (d.scheduledFor ?? d.postedAt?.slice(0, 10) ?? null) : d.scheduledFor,
          href: `/drafts/${d.id}`,
        })),
      // An idea that already has a draft is represented by the draft.
      ...ideas
        .filter((i) => i.status !== "archived" && !draftIdeaIds.has(i.id))
        .map((i) => ({ id: i.id, kind: "idea" as const, title: i.title, status: i.status, category: i.category, date: i.scheduledFor, href: `/ideas?open=${i.id}` })),
    ];
    return all.map((it) => (it.id in pending ? { ...it, date: pending[it.id] } : it));
  }, [ideas, drafts, pending]);

  const days = useMemo(() => {
    const first = new Date(cursor);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [cursor]);

  const byDay = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of items) if (it.date) m.set(it.date, [...(m.get(it.date) ?? []), it]);
    return m;
  }, [items]);

  const unscheduled = items.filter((i) => !i.date && i.status !== "posted");
  const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
  const monthItems = items.filter((i) => i.date?.startsWith(monthKey));

  const themes = useMemo(() => {
    const c = new Map<string, number>();
    for (const i of monthItems) c.set(i.category ?? "Uncategorized", (c.get(i.category ?? "Uncategorized") ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthItems]);

  const suggestion = useMemo(() => {
    const categorized = themes.filter(([k]) => k !== "Uncategorized");
    const total = categorized.reduce((a, [, n]) => a + n, 0);
    if (total >= 3 && categorized[0] && categorized[0][1] / total >= 0.45) {
      const recent = new Set([...categorized.map(([k]) => k), ...sampleTopics.filter((s) => s.date?.startsWith(monthKey)).map((s) => s.topic)]);
      const fresh = ["Personal", "Projects", "Learning", "Community", "Career", "AI", "Open source"].filter((c) => !recent.has(c)).slice(0, 2);
      return `${categorized[0][0]} is ${Math.round((categorized[0][1] / total) * 100)}% of this month. ${
        fresh.length ? `Consider mixing in something about ${fresh.join(" or ").toLowerCase()}.` : "Consider a different angle or format for the next one."
      }`;
    }
    return null;
  }, [themes, sampleTopics, monthKey]);

  async function move(id: string, kind: Item["kind"], date: string | null) {
    setPending((p) => ({ ...p, [id]: date }));
    try {
      await api(kind === "idea" ? `/api/ideas/${id}` : `/api/drafts/${id}`, "PATCH", { scheduledFor: date });
      router.refresh();
    } catch {
      setPending((p) => {
        const { [id]: _, ...rest } = p;
        return rest;
      });
    }
  }

  function onDrop(e: React.DragEvent, date: string | null) {
    e.preventDefault();
    setOver(null);
    const [kind, id] = e.dataTransfer.getData("text/plain").split(":");
    if (id) move(id, kind as Item["kind"], date);
  }

  const today = ymd(new Date());

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl">{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
          <div className="flex gap-1">
            <button className="chip" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              ←
            </button>
            <button className="chip" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
              Today
            </button>
            <button className="chip" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              →
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-7 overflow-hidden rounded-xl border border-line bg-line [gap:1px]">
            {WEEKDAYS.map((w) => (
              <div key={w} className="bg-paper-sunk px-2 py-1.5 text-xs font-medium text-ink-faint">
                {w}
              </div>
            ))}
            {days.map((d) => {
              const key = ymd(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              return (
                <div
                  key={key}
                  onDragOver={(e) => (e.preventDefault(), setOver(key))}
                  onDragLeave={() => setOver((o) => (o === key ? null : o))}
                  onDrop={(e) => onDrop(e, key)}
                  className={`min-h-[104px] p-1.5 transition ${inMonth ? "bg-paper-raised" : "bg-paper"} ${over === key ? "!bg-accent-soft" : ""}`}
                >
                  <div className={`mb-1 text-xs ${key === today ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white" : inMonth ? "text-ink-soft" : "text-ink-faint/60"}`}>
                    {d.getDate()}
                  </div>
                  <div className="space-y-1">
                    {(byDay.get(key) ?? []).map((it) => (
                      <Chip key={it.id} item={it} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-faint">
          {LEGEND.map(([k, l]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${STYLE[k]}`} /> {l}
            </span>
          ))}
        </div>
      </div>

      <aside className="space-y-6">
        <div
          onDragOver={(e) => (e.preventDefault(), setOver("unscheduled"))}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => onDrop(e, null)}
          className={`rounded-xl border border-dashed p-3 transition ${over === "unscheduled" ? "border-accent bg-accent-soft" : "border-line"}`}
        >
          <p className="mb-2 text-sm font-semibold">Unscheduled</p>
          {unscheduled.length === 0 ? (
            <p className="text-xs text-ink-faint">Everything has a date.</p>
          ) : (
            <div className="max-h-[420px] space-y-1.5 overflow-y-auto">
              {unscheduled.map((it) => (
                <Chip key={it.id} item={it} large />
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Posting themes this month</p>
          {themes.length === 0 ? (
            <p className="text-xs text-ink-faint">Nothing planned this month yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {themes.map(([k, n]) => (
                <li key={k} className="flex items-center gap-2">
                  <span className="flex-1">{k}</span>
                  <span className="h-1.5 rounded-full bg-ink/70" style={{ width: `${Math.min(100, n * 18)}px` }} />
                  <span className="w-4 text-right tabular-nums text-ink-faint">{n}</span>
                </li>
              ))}
            </ul>
          )}
          {suggestion && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">🌱 {suggestion}</p>}
        </div>
      </aside>
    </div>
  );
}

function Chip({ item, large }: { item: Item; large?: boolean }) {
  return (
    <Link
      href={item.href}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", `${item.kind}:${item.id}`)}
      className={`block cursor-grab truncate rounded-md px-1.5 py-1 text-xs active:cursor-grabbing ${STYLE[item.status] ?? STYLE.idea} ${large ? "py-1.5 text-[13px]" : ""}`}
      title={item.title}
    >
      {item.kind === "idea" ? "💭 " : ""}
      {item.title}
    </Link>
  );
}
