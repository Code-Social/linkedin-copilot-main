"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { api, fmtDate, refreshWorkspaceCounts } from "@/lib/client";
import { CATEGORIES, DRAFT_STATUSES, type Draft, type SimilarPost } from "@/lib/types";
import { Button, CopyButton, ErrorNote, Field } from "./ui";

const countWords = (t: string) => t.split(/\s+/).filter(Boolean).length;

// Mathematical alphanumeric unicode converters
function toUnicodeBold(text: string): string {
  return text.replace(/[a-zA-Z0-9]/g, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d400 + code - 65);
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d41a + code - 97);
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7ce + code - 48);
    return char;
  });
}

function toUnicodeItalic(text: string): string {
  return text.replace(/[a-zA-Z]/g, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d434 + code - 65);
    if (code >= 97 && code <= 122) {
      if (char === "h") return "ℎ";
      return String.fromCodePoint(0x1d44e + code - 97);
    }
    return char;
  });
}

function clearFormatting(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    // Map mathematical bold & italic back to standard ASCII
    .replace(/[\u{1D400}-\u{1D433}\u{1D434}-\u{1D467}\u{1D7CE}-\u{1D7D7}]/gu, (c) => {
      const code = c.codePointAt(0)!;
      if (code >= 0x1d400 && code <= 0x1d419) return String.fromCharCode(65 + code - 0x1d400);
      if (code >= 0x1d41a && code <= 0x1d433) return String.fromCharCode(97 + code - 0x1d41a);
      if (code >= 0x1d434 && code <= 0x1d44d) return String.fromCharCode(65 + code - 0x1d434);
      if (code >= 0x1d44e && code <= 0x1d467) return String.fromCharCode(97 + code - 0x1d44e);
      if (code >= 0x1d7ce && code <= 0x1d7d7) return String.fromCharCode(48 + code - 0x1d7ce);
      return c;
    });
}

const HOOK_TEMPLATES = [
  "Most people think [X], but the reality is [Y]:",
  "3 lessons I learned from [experience]:",
  "How to achieve [goal] without [common pain point]:",
  "Here is the single biggest mistake I see in [industry]:",
  "If I had to start over in [field], here is what I would do differently:",
  "Unpopular opinion: [perspective]",
];

export function DraftEditor({ draft, similar, avgWords }: { draft: Draft; similar: SimilarPost | null; avgWords: number | null }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [status, setStatus] = useState(draft.status);
  const [category, setCategory] = useState(draft.category ?? "");
  const [scheduledFor, setScheduledFor] = useState(draft.scheduledFor ?? "");
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [showHooks, setShowHooks] = useState(false);

  const dirty =
    title !== draft.title ||
    body !== draft.body ||
    status !== draft.status ||
    category !== (draft.category ?? "") ||
    scheduledFor !== (draft.scheduledFor ?? "");

  async function save(extra: Partial<Draft> = {}) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/drafts/${draft.id}`, "PATCH", {
        title,
        body,
        status,
        category: category || null,
        scheduledFor: scheduledFor || null,
        ...extra,
      });
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

  // Text formatting utilities
  function applyTransform(transform: (s: string) => string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = body.slice(start, end);
    if (!selected) return;

    const transformed = transform(selected);
    const next = body.slice(0, start) + transformed + body.slice(end);
    setBody(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start, start + transformed.length);
    }, 0);
  }

  function applyPrefix(prefix: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = body.slice(start, end) || "";

    const lines = selected.split("\n");
    const transformed = lines
      .map((l, i) => {
        const clean = l.replace(/^(\d+\.\s+|[•→-]\s*)/, "");
        if (prefix === "1. ") return `${i + 1}. ${clean}`;
        return `${prefix}${clean}`;
      })
      .join("\n");

    const next = body.slice(0, start) + transformed + body.slice(end);
    setBody(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start, start + transformed.length);
    }, 0);
  }

  function insertHook(hookText: string) {
    const el = textareaRef.current;
    const next = hookText + (body ? "\n\n" + body : "");
    setBody(next);
    setShowHooks(false);
    setTimeout(() => {
      el?.focus();
      el?.setSelectionRange(0, hookText.length);
    }, 0);
  }

  const chars = body.length;
  const words = countWords(body);
  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const readingTime = Math.max(1, Math.round(words / 200));
  const hookExcerpt = body.slice(0, 210);

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
          <input
            className="mb-3 w-full bg-transparent font-serif text-2xl outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Draft title"
          />

          <div className="card overflow-hidden">
            {/* View Mode & Formatting Toolbar */}
            <div className="flex flex-wrap items-center justify-between border-b border-line bg-paper-sunk/40 px-3 py-2 text-xs">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode("edit")}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    viewMode === "edit" ? "bg-paper-raised text-ink shadow-xs" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  ✏️ Editor
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    viewMode === "preview" ? "bg-paper-raised text-ink shadow-xs" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  👁️ LinkedIn Preview
                </button>
              </div>

              {viewMode === "edit" && (
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => applyTransform(toUnicodeBold)}
                    title="Convert selected text to Unicode bold (Ctrl+B)"
                    className="rounded px-2 py-0.5 font-bold hover:bg-paper-raised text-ink"
                  >
                    𝗕
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTransform(toUnicodeItalic)}
                    title="Convert selected text to Unicode italic (Ctrl+I)"
                    className="rounded px-2 py-0.5 italic hover:bg-paper-raised text-ink"
                  >
                    𝘐
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPrefix("• ")}
                    title="Add bullet points"
                    className="rounded px-2 py-0.5 hover:bg-paper-raised text-ink"
                  >
                    • Bullet
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPrefix("1. ")}
                    title="Add numbered list"
                    className="rounded px-2 py-0.5 hover:bg-paper-raised text-ink"
                  >
                    1. List
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPrefix("→ ")}
                    title="Add arrow pointer"
                    className="rounded px-2 py-0.5 hover:bg-paper-raised text-ink"
                  >
                    → Arrow
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTransform(clearFormatting)}
                    title="Remove formatting from selected text"
                    className="rounded px-1.5 py-0.5 text-ink-faint hover:text-ink hover:bg-paper-raised"
                  >
                    Normal
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowHooks((prev) => !prev)}
                      className="rounded px-2 py-0.5 text-accent hover:bg-paper-raised"
                      title="Insert hook template"
                    >
                      ⚡ Hooks
                    </button>
                    {showHooks && (
                      <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-line bg-paper-raised p-1 shadow-lg">
                        <p className="px-2 py-1 text-[11px] font-semibold text-ink-faint">Hook templates</p>
                        {HOOK_TEMPLATES.map((h, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => insertHook(h)}
                            className="w-full text-left rounded px-2 py-1.5 text-xs text-ink-soft hover:bg-paper-sunk hover:text-ink"
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Main Content Area: Editor or LinkedIn Preview */}
            {viewMode === "edit" ? (
              <textarea
                ref={textareaRef}
                className="post-text min-h-[440px] w-full resize-y rounded-b-lg bg-transparent px-4 py-3 outline-none"
                value={body}
                placeholder="Write your LinkedIn post here..."
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.metaKey || e.ctrlKey) {
                    if (e.key === "s") {
                      e.preventDefault();
                      save();
                    } else if (e.key === "b") {
                      e.preventDefault();
                      applyTransform(toUnicodeBold);
                    } else if (e.key === "i") {
                      e.preventDefault();
                      applyTransform(toUnicodeItalic);
                    }
                  }
                }}
              />
            ) : (
              /* Realistic LinkedIn Feed Preview */
              <div className="p-4 bg-paper-sunk/20 min-h-[440px]">
                <div className="mx-auto max-w-xl rounded-xl border border-line bg-paper-raised p-4 shadow-sm">
                  {/* LinkedIn Profile Header */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent font-semibold text-sm">
                      👤
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-ink truncate">You (Author)</span>
                        <span className="text-xs text-ink-faint">• 1st</span>
                      </div>
                      <p className="truncate text-xs text-ink-soft">Creator & Professional · LinkedIn Copilot</p>
                      <p className="text-[11px] text-ink-faint">Just now · 🌐</p>
                    </div>
                  </div>

                  {/* LinkedIn Post Body with ...see more simulation */}
                  <div className="mt-3 text-sm text-ink leading-relaxed">
                    {!body.trim() ? (
                      <p className="italic text-ink-faint">No content written yet. Switch to Editor to write.</p>
                    ) : chars <= 210 || previewExpanded ? (
                      <div>
                        <p className="post-text whitespace-pre-wrap">{body}</p>
                        {chars > 210 && (
                          <button
                            type="button"
                            onClick={() => setPreviewExpanded(false)}
                            className="mt-2 text-xs font-semibold text-accent hover:underline"
                          >
                            Show less
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="post-text whitespace-pre-wrap">{hookExcerpt}</span>
                        <span>... </span>
                        <button
                          type="button"
                          onClick={() => setPreviewExpanded(true)}
                          className="font-semibold text-ink hover:underline text-sm"
                        >
                          see more
                        </button>
                      </div>
                    )}
                  </div>

                  {/* LinkedIn Action Bar */}
                  <div className="mt-4 flex items-center justify-around border-t border-line pt-2 text-xs font-medium text-ink-soft">
                    <span className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-paper-sunk cursor-pointer">
                      👍 Like
                    </span>
                    <span className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-paper-sunk cursor-pointer">
                      💬 Comment
                    </span>
                    <span className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-paper-sunk cursor-pointer">
                      🔁 Repost
                    </span>
                    <span className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-paper-sunk cursor-pointer">
                      📤 Send
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Status & Info Bar */}
            <div className="flex flex-wrap items-center justify-between border-t border-line px-3 py-2 text-xs text-ink-faint">
              <div className="flex flex-wrap items-center gap-2">
                <span className={chars > 3000 ? "font-semibold text-red-600" : chars > 2800 ? "text-amber-600" : ""}>
                  {chars.toLocaleString()} / 3,000 chars
                </span>
                <span>·</span>
                <span>{words} words</span>
                <span>·</span>
                <span>~{readingTime} min read</span>
                <span>·</span>
                <span>{paragraphs} paragraph{paragraphs === 1 ? "" : "s"}</span>
              </div>
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
          {/* Feed Hook Analysis */}
          <div className="card p-5 text-sm">
            <p className="label">Feed Hook (First 210 Chars)</p>
            {chars === 0 ? (
              <p className="mt-1 text-ink-faint">Start writing to inspect your post hook.</p>
            ) : (
              <>
                <p className="mt-1.5 border-l-2 border-accent pl-3 text-xs italic text-ink-soft">
                  &ldquo;{hookExcerpt}{chars > 210 ? "..." : ""}&rdquo;
                </p>
                <p className="mt-2 text-xs text-ink-faint">
                  {chars > 210
                    ? "Readers click “see more” after this. Make sure your punchline or curiosity gap is inside this snippet."
                    : "Entire post fits in the feed before the “see more” fold."}
                </p>
              </>
            )}
          </div>

          {/* Length Check */}
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

          {/* Repeat Check */}
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
