"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, fmtDate, refreshWorkspaceCounts } from "@/lib/client";
import { CATEGORIES, DRAFT_STATUSES, type Draft, type SimilarPost } from "@/lib/types";
import { Button, CopyButton, ErrorNote, Field } from "./ui";

const countWords = (t: string) => t.split(/\s+/).filter(Boolean).length;

export function DraftEditor({ draft, similar, avgWords }: { draft: Draft; similar: SimilarPost | null; avgWords: number | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [status, setStatus] = useState(draft.status);
  const [category, setCategory] = useState(draft.category ?? "");
  const [scheduledFor, setScheduledFor] = useState(draft.scheduledFor ?? "");
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = title !== draft.title || body !== draft.body || status !== draft.status || category !== (draft.category ?? "") || scheduledFor !== (draft.scheduledFor ?? "");

  async function save(extra: Partial<Draft> = {}) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/drafts/${draft.id}`, "PATCH", { title, body, status, category: category || null, scheduledFor: scheduledFor || null, ...extra });
      setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
      router.refresh();
      refreshWorkspaceCounts();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function markPosted() {
    setStatus("posted");
    await save({ status: "posted" });
  }

  async function remove() {
    if (!confirm("Delete this draft?")) return;
    try {
      await api(`/api/drafts/${draft.id}`, "DELETE");
      router.push("/drafts");
      router.refresh();
      refreshWorkspaceCounts();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const chars = body.length;
  const words = countWords(body);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/drafts" className="text-sm text-ink-faint hover:text-ink">
          ← Drafts
        </Link>
        <div className="flex items-center gap-2 text-xs text-ink-faint">
          {dirty ? "Unsaved changes" : savedAt ? `Saved ${savedAt}` : `Updated ${fmtDate(draft.updatedAt)}`}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <input className="mb-3 w-full bg-transparent font-serif text-2xl outline-none" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="card p-1">
            <textarea
              className="post-text min-h-[440px] w-full resize-y rounded-lg bg-transparent px-4 py-3 outline-none"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "s" && (e.preventDefault(), save())}
            />
            <div className="flex items-center justify-between border-t border-line px-3 py-2 text-xs text-ink-faint">
              <span className={chars > 3000 ? "text-red-600" : ""}>
                {chars.toLocaleString()} / 3,000 · first {Math.min(chars, 210)} chars show before &ldquo;see more&rdquo;
              </span>
              <CopyButton text={body} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Status">
              <select className="field" value={status} onChange={(e) => setStatus(e.target.value as Draft["status"])}>
                {DRAFT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.emoji} {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">None</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Post date">
              <input type="date" className="field" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            </Field>
          </div>

          <div className="mt-4">
            <ErrorNote error={error} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={() => save()} loading={busy} disabled={!dirty}>
              Save
            </Button>
            {status !== "posted" && (
              <Button variant="secondary" onClick={markPosted}>
                ✅ Mark as posted
              </Button>
            )}
            <Button variant="danger" className="ml-auto" onClick={remove}>
              Delete
            </Button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-5 text-sm">
            <p className="label">Length</p>
            <p>
              <span className="font-serif text-2xl">{words}</span> words
            </p>
            {avgWords ? (
              <p className="mt-1 text-ink-soft">
                Your posts average {avgWords} words.
                {words > avgWords * 1.5 ? " This one runs long." : words > 0 && words < avgWords * 0.5 ? " This one is short." : ""}
              </p>
            ) : (
              <p className="mt-1 text-ink-faint">Add writing samples to compare with your usual length.</p>
            )}
          </div>

          <div className="card p-5 text-sm">
            <p className="label">Repeat check</p>
            {similar ? (
              <>
                <p className="text-amber-900">🔁 This looks similar to a {similar.kind === "post" ? "post you published" : "past post"}:</p>
                <p className="mt-2 border-l-2 border-amber-300 pl-3 italic text-ink-soft">{similar.excerpt}</p>
                {similar.kind === "post" && (
                  <Link href={`/drafts/${similar.id}`} className="mt-2 inline-block text-xs text-accent hover:underline">
                    Open it →
                  </Link>
                )}
              </>
            ) : (
              <p className="text-ink-soft">No close match among your past posts.</p>
            )}
            <p className="mt-2 text-xs text-ink-faint">Updates when you save.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
