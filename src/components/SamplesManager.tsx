"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, fmtDate } from "@/lib/client";
import { CATEGORIES, type Feedback, type Sample } from "@/lib/types";
import { Button, Empty, ErrorNote, Field, Modal, PageHeader } from "./ui";

const FEEDBACK: { value: Exclude<Feedback, null>; emoji: string; label: string }[] = [
  { value: "exact", emoji: "❤️", label: "This sounds exactly like me" },
  { value: "like", emoji: "👍", label: "I like this" },
  { value: "not", emoji: "👎", label: "This doesn't sound like me" },
];

type Form = { text: string; postedOn: string; topic: string; reactions: string; comments: string; reposts: string; notes: string; feedback: Feedback };
const EMPTY: Form = { text: "", postedOn: "", topic: "", reactions: "", comments: "", reposts: "", notes: "", feedback: null };

const toPayload = (f: Form) => ({
  text: f.text,
  postedOn: f.postedOn || null,
  topic: f.topic || null,
  reactions: f.reactions ? Number(f.reactions) : null,
  comments: f.comments ? Number(f.comments) : null,
  reposts: f.reposts ? Number(f.reposts) : null,
  notes: f.notes || null,
  feedback: f.feedback,
});

export function SamplesManager({ samples }: { samples: Sample[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "one" | "bulk">(null);
  const [editing, setEditing] = useState<Sample | null>(null);
  const [filter, setFilter] = useState<"all" | Exclude<Feedback, null> | "unrated">("all");
  const [searchInput, setSearchInput] = useState("");
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shown = samples.filter((s) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "unrated"
          ? !s.feedback
          : s.feedback === filter;

    const keyword = searchInput.trim().toLowerCase();

    const matchesSearch =
      s.text.toLowerCase().includes(keyword) ||
      (s.topic ?? "").toLowerCase().includes(keyword);

    return matchesFilter && matchesSearch;
  });

  async function rate(s: Sample, fb: Feedback) {
    try {
      await api(`/api/samples/${s.id}`, "PATCH", { feedback: s.feedback === fb ? null : fb });
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function submitBulk() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/samples/bulk", "POST", { text: bulk });
      setBulk("");
      setMode(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const bulkCount = bulk.split(/^\s*-{3,}\s*$/m).filter((p) => p.trim().length > 20).length;

  return (
    <>
      <PageHeader
        title="Writing Samples"
        subtitle="Your real posts are the source of truth. Rate them so the ones that sound most like you carry more weight."
        actions={
          <>
            <Button variant="secondary" onClick={() => setMode("bulk")}>
              Paste many
            </Button>
            <Button onClick={() => setMode("one")}>+ Add post</Button>
          </>
        }
      />

      <input
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search writing samples..."
        className="field w-full mb-5 text-sm placeholder:text-ink-faint"
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["all", "All", samples.length],
            ["exact", "❤️ Exactly me", samples.filter((s) => s.feedback === "exact").length],
            ["like", "👍 Like", samples.filter((s) => s.feedback === "like").length],
            ["not", "👎 Not me", samples.filter((s) => s.feedback === "not").length],
            ["unrated", "Unrated", samples.filter((s) => !s.feedback).length],
          ] as const
        ).map(([k, l, n]) => (
          <button key={k} className={`chip ${filter === k ? "chip-on" : ""}`} onClick={() => setFilter(k)}>
            {l} <span className="opacity-60">{n}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Empty>
          {samples.length === 0
            ? "Add 20 to 50 of your LinkedIn posts. Paste many at once with “Paste many”."
            : searchInput.trim()
              ? "No writing samples found. Try another keyword."
              : "No writing samples to show. Try a different feedback filter."}
        </Empty>
      ) : (
        <div className="columns-1 gap-4 md:columns-2 [&>*]:mb-4">
          {shown.map((s) => (
            <article key={s.id} className="card break-inside-avoid p-5">
              <p className="post-text line-clamp-[12] text-[14px]">{s.text}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                {s.postedOn && <span>{new Date(s.postedOn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}                {s.comments != null && <span>💬 {s.comments}</span>}
                {s.reposts != null && <span>🔁 {s.reposts}</span>}
              </div>
              {s.notes && <p className="mt-2 text-xs italic text-ink-soft">{s.notes}</p>}
              <div className="mt-3 flex items-center gap-1 border-t border-line pt-3">
                {FEEDBACK.map((f) => (
                  <button
                    key={f.value}
                    title={f.label}
                    onClick={() => rate(s, f.value)}
                    className={`rounded-md px-2 py-1 text-sm transition ${s.feedback === f.value ? "bg-paper-sunk ring-1 ring-ink/15" : "opacity-50 grayscale hover:opacity-100 hover:grayscale-0"}`}
                  >
                    {f.emoji}
                  </button>
                ))}
                <button className="ml-auto text-xs text-ink-faint hover:text-ink" onClick={() => setEditing(s)}>
                  Edit
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={mode === "bulk"} onClose={() => setMode(null)} title="Paste many posts" wide>
        <p className="mb-3 text-sm text-ink-soft">
          Paste your posts with a line containing only <code className="rounded bg-paper-sunk px-1">---</code> between each one.
        </p>
        <textarea className="field post-text min-h-[360px] text-sm" value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={"First post...\n---\nSecond post...\n---\nThird post..."} />
        <div className="mt-3">
          <ErrorNote error={error} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-ink-faint">{bulkCount} posts detected</span>
          <Button onClick={submitBulk} loading={busy} disabled={!bulkCount}>
            Add {bulkCount} posts
          </Button>
        </div>
      </Modal>

      {mode === "one" && (
        <SampleForm
          title="Add a post"
          initial={EMPTY}
          onClose={() => setMode(null)}
          onSubmit={async (f) => {
            await api("/api/samples", "POST", toPayload(f));
            setMode(null);
            router.refresh();
          }}
        />
      )}
      {editing && (
        <SampleForm
          title="Edit sample"
          initial={{
            text: editing.text,
            postedOn: editing.postedOn ?? "",
            topic: editing.topic ?? "",
            reactions: editing.reactions?.toString() ?? "",
            comments: editing.comments?.toString() ?? "",
            reposts: editing.reposts?.toString() ?? "",
            notes: editing.notes ?? "",
            feedback: editing.feedback,
          }}
          onClose={() => setEditing(null)}
          onDelete={async () => {
            if (!confirm("Delete this sample?")) return;
            await api(`/api/samples/${editing.id}`, "DELETE");
            setEditing(null);
            router.refresh();
          }}
          onSubmit={async (f) => {
            await api(`/api/samples/${editing.id}`, "PATCH", toPayload(f));
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function SampleForm({
  title,
  initial,
  onClose,
  onSubmit,
  onDelete,
}: {
  title: string;
  initial: Form;
  onClose: () => void;
  onSubmit: (f: Form) => Promise<void>;
  onDelete?: () => void;
}) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Modal open onClose={onClose} title={title} wide>
      <div className="space-y-4">
        <textarea autoFocus className="field post-text min-h-[260px] text-sm" placeholder="Paste the post exactly as you wrote it" value={f.text} onChange={set("text")} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date posted">
            <input type="date" className="field" value={f.postedOn} onChange={set("postedOn")} />
          </Field>
          <Field label="Topic">
            <select className="field" value={f.topic} onChange={set("topic")}>
              <option value="">None</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Reactions">
            <input type="number" min={0} className="field" value={f.reactions} onChange={set("reactions")} />
          </Field>
          <Field label="Comments">
            <input type="number" min={0} className="field" value={f.comments} onChange={set("comments")} />
          </Field>
          <Field label="Reposts">
            <input type="number" min={0} className="field" value={f.reposts} onChange={set("reposts")} />
          </Field>
        </div>
        <Field label="How does it sound?">
          <div className="flex flex-wrap gap-1.5">
            {FEEDBACK.map((fb) => (
              <button key={fb.value} type="button" onClick={() => setF({ ...f, feedback: f.feedback === fb.value ? null : fb.value })} className={`chip ${f.feedback === fb.value ? "chip-on" : ""}`}>
                {fb.emoji} {fb.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Notes">
          <input className="field" value={f.notes} onChange={set("notes")} placeholder="Why it worked, what you'd change..." />
        </Field>
        <ErrorNote error={error} />
        <div className="flex items-center justify-between">
          {onDelete ? (
            <Button variant="danger" onClick={onDelete}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button
            loading={busy}
            disabled={!f.text.trim()}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onSubmit(f);
              } catch (e) {
                setError((e as Error).message);
                setBusy(false);
              }
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
