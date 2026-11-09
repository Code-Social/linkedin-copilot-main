"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, fmtDate, refreshWorkspaceCounts } from "@/lib/client";
import { CATEGORIES, IDEA_STATUSES, PRIORITIES, type Idea } from "@/lib/types";
import { QuickIdea } from "./QuickIdea";
import { Button, Empty, ErrorNote, Field, Modal, PageHeader } from "./ui";

const PRIORITY_STYLE: Record<string, string> = {
  high: "border-amber-200 bg-amber-50 text-amber-800",
  medium: "",
  low: "text-ink-faint",
};

export function IdeasBoard({ ideas, openId }: { ideas: Idea[]; openId: string | null }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("active");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [openIdea, setOpenIdea] = useState<string | null>(openId);

  useEffect(() => setOpenIdea(openId), [openId]);

  const shown = useMemo(() => {
    const term = q.toLowerCase();
    return ideas
      .filter((i) => (filter === "active" ? !["posted", "archived"].includes(i.status) : filter === "all" ? true : i.status === filter))
      .filter((i) => !term || [i.title, i.description, i.hook, i.notes, i.tags.join(" "), i.category].join(" ").toLowerCase().includes(term))
      .sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));
  }, [ideas, filter, q]);

  const current = ideas.find((i) => i.id === openIdea) ?? null;

  return (
    <>
      <PageHeader
        title="Ideas"
        subtitle="Everything you might post about. Open one to edit it or turn it into a draft."
        actions={<Button onClick={() => setAdding(true)}>+ New idea</Button>}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {[{ value: "active", label: "Active", emoji: "" }, ...IDEA_STATUSES, { value: "all", label: "All", emoji: "" }].map((s) => (
          <button key={s.value} onClick={() => setFilter(s.value)} className={`chip ${filter === s.value ? "chip-on" : ""}`}>
            {s.emoji} {s.label}
            <span className="opacity-60">
              {s.value === "active"
                ? ideas.filter((i) => !["posted", "archived"].includes(i.status)).length
                : s.value === "all"
                  ? ideas.length
                  : ideas.filter((i) => i.status === s.value).length}
            </span>
          </button>
        ))}
        <input className="field ml-auto w-full max-w-[220px] py-1.5 text-sm" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {shown.length === 0 ? (
        <Empty>
          {ideas.length === 0
            ? "No ideas here yet."
            : "No ideas match your search or filters."}
        </Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((i) => {
            const st = IDEA_STATUSES.find((s) => s.value === i.status);
            return (
              <button key={i.id} onClick={() => setOpenIdea(i.id)} className="card p-4 text-left transition hover:border-ink/25">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium leading-snug">{i.title}</p>
                  {i.priority !== "medium" && <span className={`chip shrink-0 capitalize ${PRIORITY_STYLE[i.priority]}`}>{i.priority}</span>}
                </div>
                {i.hook && <p className="mt-1.5 line-clamp-2 font-serif text-[15px] italic text-ink-soft">&ldquo;{i.hook}&rdquo;</p>}
                {!i.hook && i.description && <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{i.description}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
                  <span>
                    {st?.emoji} {st?.label}
                  </span>
                  {i.category && <span className="chip py-0.5">{i.category}</span>}
                  {i.tags.map((t) => (
                    <span key={t}>#{t}</span>
                  ))}
                  {i.scheduledFor && <span>· 📅 {fmtDate(i.scheduledFor)}</span>}
                  <span className="ml-auto">{fmtDate(i.createdAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <QuickIdea open={adding} onClose={() => setAdding(false)} onSaved={() => (setAdding(false), router.refresh(), refreshWorkspaceCounts())} />
      {current && (
        <IdeaDetail
          key={current.id}
          idea={current}
          onClose={() => {
            setOpenIdea(null);
            if (openId) router.replace("/ideas");
          }}
        />
      )}
    </>
  );
}

function IdeaDetail({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const router = useRouter();
  const [d, setD] = useState({
    title: idea.title,
    description: idea.description ?? "",
    category: idea.category ?? "",
    status: idea.status,
    priority: idea.priority,
    notes: idea.notes ?? "",
    hook: idea.hook ?? "",
    links: idea.links.join("\n"),
    tags: idea.tags.join(", "),
    scheduledFor: idea.scheduledFor ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload = () => ({
    ...d,
    description: d.description || null,
    category: d.category || null,
    notes: d.notes || null,
    hook: d.hook || null,
    scheduledFor: d.scheduledFor || null,
    links: d.links.split(/\n|,\s*/).map((s) => s.trim()).filter(Boolean),
    tags: d.tags.split(",").map((s) => s.trim().replace(/^#/, "")).filter(Boolean),
  });

  async function save(close = true) {
    setSaving(true);
    setError(null);
    try {
      await api(`/api/ideas/${idea.id}`, "PATCH", payload());
      router.refresh();
      refreshWorkspaceCounts();
      if (close) onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this idea?")) return;
    try {
      await api(`/api/ideas/${idea.id}`, "DELETE");
      router.refresh();
      refreshWorkspaceCounts();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Turn the idea into a draft, starting from its hook.
  const write = async () => {
    setError(null);
    try {
      await api(`/api/ideas/${idea.id}`, "PATCH", payload());
      const draft = await api<{ id: string }>("/api/drafts", "POST", {
        title: d.title,
        body: d.hook ? `${d.hook}\n\n` : "",
        ideaId: idea.id,
        category: d.category || null,
      });
      refreshWorkspaceCounts();
      router.push(`/drafts/${draft.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Modal open onClose={onClose} title="Idea" wide>
      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <input className="field font-serif text-lg" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
          <Field label="Description">
            <textarea className="field min-h-[90px]" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
          </Field>
          <Field label="Potential hook">
            <textarea className="field min-h-[60px] font-serif" value={d.hook} onChange={(e) => setD({ ...d, hook: e.target.value })} />
          </Field>
          <Field label="Notes">
            <textarea className="field min-h-[70px]" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
          </Field>
        </div>

        <div className="space-y-4">
          <Field label="Status">
            <select className="field" value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as Idea["status"] })}>
              {IDEA_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.emoji} {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select className="field capitalize" value={d.priority} onChange={(e) => setD({ ...d, priority: e.target.value as Idea["priority"] })}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select className="field" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })}>
              <option value="">None</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Planned date">
            <input type="date" className="field" value={d.scheduledFor} onChange={(e) => setD({ ...d, scheduledFor: e.target.value })} />
          </Field>
          <Field label="Tags" hint="Comma separated">
            <input className="field" value={d.tags} onChange={(e) => setD({ ...d, tags: e.target.value })} />
          </Field>
          <Field label="Related links" hint="One per line">
            <textarea className="field min-h-[70px] text-sm" value={d.links} onChange={(e) => setD({ ...d, links: e.target.value })} />
          </Field>
          {idea.links.length > 0 && (
            <ul className="space-y-1 text-xs">
              {idea.links.map((l) => (
                <li key={l} className="truncate">
                  <a href={l} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-ink-faint">Created {fmtDate(idea.createdAt, { month: "short", day: "numeric", year: "numeric" })}</p>
        </div>
      </div>

      <div className="mt-6">
        <ErrorNote error={error} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <Button variant="danger" onClick={remove}>
          Delete
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => save()} loading={saving}>
            Save
          </Button>
          <Button onClick={() => write()}>✍️ Write this post</Button>
        </div>
      </div>
    </Modal>
  );
}
