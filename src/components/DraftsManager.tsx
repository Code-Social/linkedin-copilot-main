"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, DRAFT_STATUSES, type Draft, type IdeaStatus } from "@/lib/types";
import { Button, Empty, LinkButton, PageHeader } from "./ui";

const fmt = (iso: string) =>
  new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const countWords = (t: string) => t.split(/\s+/).filter(Boolean).length;

export function DraftsManager({ drafts }: { drafts: Draft[] }) {
  const [filter, setFilter] = useState<string>("all");
  const [category, setCategory] = useState<string>("");
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return drafts.filter((d) => {
      // Status filter
      if (filter === "active") {
        if (d.status === "posted" || d.status === "archived") return false;
      } else if (filter !== "all" && d.status !== filter) {
        return false;
      }

      // Category filter
      if (category && d.category !== category) {
        return false;
      }

      // Search term
      if (term) {
        const matchesTitle = d.title.toLowerCase().includes(term);
        const matchesBody = d.body.toLowerCase().includes(term);
        const matchesCategory = (d.category ?? "").toLowerCase().includes(term);
        if (!matchesTitle && !matchesBody && !matchesCategory) return false;
      }

      return true;
    });
  }, [drafts, filter, category, q]);

  const activeCount = drafts.filter((d) => !["posted", "archived"].includes(d.status)).length;

  return (
    <>
      <PageHeader
        title="Drafts"
        subtitle="Write, edit, and schedule your posts."
        actions={
          <LinkButton href="/drafts/new" variant="primary">
            + New draft
          </LinkButton>
        }
      />

      {/* Filter and Search Bar */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: "all", label: "All", emoji: "", count: drafts.length },
            { value: "active", label: "Active", emoji: "⚡", count: activeCount },
            ...DRAFT_STATUSES.map((s) => ({
              value: s.value,
              label: s.label,
              emoji: s.emoji,
              count: drafts.filter((d) => d.status === s.value).length,
            })),
          ].map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`chip ${filter === s.value ? "chip-on" : ""}`}
            >
              {s.emoji && <span>{s.emoji}</span>} {s.label}
              <span className="opacity-60">{s.count}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            className="field max-w-sm py-1.5 text-sm"
            placeholder="Search drafts by title, body, or category..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="field max-w-[180px] py-1.5 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {(q || category || filter !== "all") && (
            <button
              onClick={() => {
                setQ("");
                setCategory("");
                setFilter("all");
              }}
              className="text-xs text-ink-faint hover:text-ink hover:underline"
            >
              Reset filters
            </button>
          )}

          <div className="ml-auto text-xs text-ink-faint">
            Showing {shown.length} of {drafts.length}
          </div>
        </div>
      </div>

      {/* Drafts List */}
      {shown.length === 0 ? (
        <Empty>
          {drafts.length === 0 ? (
            "No drafts yet. Start one, or turn an idea into a draft from the idea bank."
          ) : (
            <div className="space-y-2">
              <p>No drafts match your search or filters.</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setQ("");
                  setCategory("");
                  setFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </Empty>
      ) : (
        <div className="space-y-3">
          {shown.map((d) => {
            const statusConfig = DRAFT_STATUSES.find((s) => s.value === d.status);
            const wordCount = countWords(d.body);
            const charCount = d.body.length;
            const firstLine = d.body.split("\n").find((l) => l.trim()) ?? "";

            return (
              <Link
                key={d.id}
                href={`/drafts/${d.id}`}
                className="card block p-4 transition hover:border-ink/25 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[16px]">{d.title}</p>
                    {firstLine && firstLine !== d.title && (
                      <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{firstLine}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-ink-faint">
                    {d.status === "posted" && d.postedAt
                      ? `Posted ${fmt(d.postedAt)}`
                      : d.scheduledFor
                      ? `📅 ${fmt(d.scheduledFor)}`
                      : fmt(d.updatedAt)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                  <span className="chip py-0.5 font-normal">
                    {statusConfig?.emoji} {statusConfig?.label}
                  </span>
                  {d.category && <span className="chip py-0.5">{d.category}</span>}
                  <span>·</span>
                  <span>{wordCount} words</span>
                  <span>·</span>
                  <span>{charCount.toLocaleString()} chars</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
