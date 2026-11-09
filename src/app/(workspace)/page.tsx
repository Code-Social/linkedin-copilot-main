import Link from "next/link";
import { Greeting } from "@/components/Greeting";
import { LinkButton, Empty, Section } from "@/components/ui";
import { computeStats } from "@/lib/memory";
import { listDrafts, listIdeas, listSamples } from "@/lib/store";
import { IDEA_STATUSES } from "@/lib/types";

const statusEmoji = (s: string) => IDEA_STATUSES.find((x) => x.value === s)?.emoji ?? "";
const fmt = (iso: string) => new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export default async function Dashboard() {
  const ideas = await listIdeas();
  const drafts = await listDrafts();
  const samples = await listSamples();
  const stats = computeStats(samples.filter((s) => s.feedback !== "not").map((s) => s.text));

  const today = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  const upcoming = [
    ...drafts.filter((d) => d.scheduledFor && d.scheduledFor >= today && d.status !== "posted").map((d) => ({ id: d.id, title: d.title, date: d.scheduledFor!, href: `/drafts/${d.id}`, status: d.status })),
    ...ideas.filter((i) => i.scheduledFor && i.scheduledFor >= today && i.status !== "posted").map((i) => ({ id: i.id, title: i.title, date: i.scheduledFor!, href: `/ideas?open=${i.id}`, status: i.status })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  const ready = drafts.filter((d) => d.status === "ready");
  const openCount = ideas.filter((i) => i.status === "idea").length;
  const working = drafts.filter((d) => d.status === "drafting" || d.status === "needs_work").slice(0, 5);
  const openIdeas = ideas.filter((i) => i.status === "idea").sort((a, b) => ["high", "medium", "low"].indexOf(a.priority) - ["high", "medium", "low"].indexOf(b.priority)).slice(0, 6);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-serif text-4xl tracking-tight"><Greeting /></h1>
        <p className="mt-2 text-ink-soft">
          {ready.length > 0
            ? `${ready.length} post${ready.length > 1 ? "s are" : " is"} ready to go.`
            : openIdeas.length > 0
              ? `You have ${openCount} idea${openCount === 1 ? "" : "s"} waiting. Pick one and write.`
              : "Capture an idea, or start a draft."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <LinkButton href="/drafts/new" variant="primary">
            ✍️ New draft
          </LinkButton>
          <LinkButton href="/ideas">💡 Idea bank</LinkButton>
        </div>
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <Section title="What should I post?" action={<Link href="/calendar" className="text-xs text-ink-faint hover:text-ink">Calendar →</Link>}>
          {ready.length + upcoming.length === 0 ? (
            <Empty>Nothing scheduled. Drag an idea or draft onto the calendar.</Empty>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-paper-raised">
              {[...ready.filter((r) => !upcoming.some((u) => u.id === r.id)).map((d) => ({ id: d.id, title: d.title, date: "", href: `/drafts/${d.id}`, status: d.status })), ...upcoming].slice(0, 5).map((u) => (
                <li key={u.id}>
                  <Link href={u.href} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper-sunk/50">
                    <span className="truncate text-[15px]">
                      {statusEmoji(u.status)} {u.title}
                    </span>
                    <span className="shrink-0 text-xs text-ink-faint">{u.date ? fmt(u.date) : "Ready"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="What am I working on?" action={<Link href="/drafts" className="text-xs text-ink-faint hover:text-ink">All drafts →</Link>}>
          {working.length === 0 ? (
            <Empty>No drafts in progress.</Empty>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-paper-raised">
              {working.map((d) => (
                <li key={d.id}>
                  <Link href={`/drafts/${d.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper-sunk/50">
                    <span className="truncate text-[15px]">
                      {statusEmoji(d.status)} {d.title}
                    </span>
                    <span className="shrink-0 text-xs text-ink-faint">{fmt(d.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="What ideas do I have?" action={<Link href="/ideas" className="text-xs text-ink-faint hover:text-ink">Idea bank →</Link>}>
          {openIdeas.length === 0 ? (
            <Empty>
              No ideas yet. Press <kbd className="rounded border border-line px-1">i</kbd> anywhere to capture one.
            </Empty>
          ) : (
            <ul className="space-y-2">
              {openIdeas.map((i) => (
                <li key={i.id}>
                  <Link href={`/ideas?open=${i.id}`} className="card flex items-center justify-between gap-3 px-4 py-3 hover:border-ink/20">
                    <span className="truncate text-[15px]">💭 {i.title}</span>
                    {i.priority === "high" && <span className="chip shrink-0 border-amber-200 bg-amber-50 text-amber-800">High</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="How does my writing sound?" action={<Link href="/voice" className="text-xs text-ink-faint hover:text-ink">My voice →</Link>}>
          <div className="card p-5">
            {stats.sampleCount === 0 ? (
              <p className="text-sm text-ink-soft">
                Add a few past posts in <Link href="/samples" className="underline">Writing Samples</Link> to see your writing stats.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat value={stats.sampleCount} label="samples" />
                <Stat value={stats.avgWords} label="words / post" />
                <Stat value={stats.avgSentenceWords} label="words / sentence" />
              </div>
            )}
          </div>
        </Section>
      </div>

    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <div className="font-serif text-2xl">{value}</div>
      <div className="text-xs text-ink-faint">{label}</div>
    </div>
  );
}
