import "server-only";
import { db, newId, now, parseJson, type Row } from "./db";
import type { Draft, Feedback, Idea, Sample, WorkspaceCounts } from "./types";

const str = (v: unknown) => (v == null ? null : String(v));
const num = (v: unknown) => (v == null ? null : Number(v));

// ---------- Samples ----------

const toSample = (r: Row): Sample => ({
  id: String(r.id),
  text: String(r.text),
  postedOn: str(r.posted_on),
  topic: str(r.topic),
  reactions: num(r.reactions),
  comments: num(r.comments),
  reposts: num(r.reposts),
  feedback: (r.feedback as Feedback) ?? null,
  notes: str(r.notes),
  createdAt: String(r.created_at),
});

export async function listSamples(): Promise<Sample[]> {
  return (await db.all("SELECT * FROM samples ORDER BY COALESCE(posted_on, created_at) DESC")).map(toSample);
}

export async function getSample(id: string): Promise<Sample | null> {
  const r = await db.get("SELECT * FROM samples WHERE id = ?", [id]);
  return r ? toSample(r) : null;
}

export async function createSample(input: Partial<Sample> & { text: string }): Promise<Sample> {
  const id = newId();
  await db.run(
    "INSERT INTO samples (id, text, posted_on, topic, reactions, comments, reposts, feedback, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [
      id,
      input.text.trim(),
      input.postedOn ?? null,
      input.topic ?? null,
      input.reactions ?? null,
      input.comments ?? null,
      input.reposts ?? null,
      input.feedback ?? null,
      input.notes ?? null,
      now(),
    ],
  );
  return (await getSample(id))!;
}

export async function updateSample(id: string, patch: Partial<Sample>): Promise<Sample | null> {
  const cur = await getSample(id);
  if (!cur) return null;
  const n = { ...cur, ...patch };
  await db.run("UPDATE samples SET text=?, posted_on=?, topic=?, reactions=?, comments=?, reposts=?, feedback=?, notes=? WHERE id=?", [
    n.text,
    n.postedOn,
    n.topic,
    n.reactions,
    n.comments,
    n.reposts,
    n.feedback,
    n.notes,
    id,
  ]);
  return getSample(id);
}

export async function deleteSample(id: string) {
  await db.run("DELETE FROM samples WHERE id = ?", [id]);
}

// ---------- Ideas ----------

const toIdea = (r: Row): Idea => ({
  id: String(r.id),
  title: String(r.title),
  description: str(r.description),
  category: str(r.category),
  status: String(r.status) as Idea["status"],
  notes: str(r.notes),
  hook: str(r.hook),
  links: parseJson<string[]>(r.links, []),
  tags: parseJson<string[]>(r.tags, []),
  priority: (String(r.priority) as Idea["priority"]) || "medium",
  scheduledFor: str(r.scheduled_for),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

export async function listIdeas(): Promise<Idea[]> {
  return (await db.all("SELECT * FROM ideas ORDER BY updated_at DESC")).map(toIdea);
}

export async function getIdea(id: string): Promise<Idea | null> {
  const r = await db.get("SELECT * FROM ideas WHERE id = ?", [id]);
  return r ? toIdea(r) : null;
}

export async function createIdea(input: Partial<Idea> & { title: string }): Promise<Idea> {
  const id = newId();
  const t = now();
  await db.run(
    "INSERT INTO ideas (id, title, description, category, status, notes, hook, links, tags, priority, scheduled_for, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [
      id,
      input.title.trim(),
      input.description ?? null,
      input.category ?? null,
      input.status ?? "idea",
      input.notes ?? null,
      input.hook ?? null,
      JSON.stringify(input.links ?? []),
      JSON.stringify(input.tags ?? []),
      input.priority ?? "medium",
      input.scheduledFor ?? null,
      t,
      t,
    ],
  );
  return (await getIdea(id))!;
}

export async function updateIdea(id: string, patch: Partial<Idea>): Promise<Idea | null> {
  const cur = await getIdea(id);
  if (!cur) return null;
  const n = { ...cur, ...patch };
  await db.run(
    "UPDATE ideas SET title=?, description=?, category=?, status=?, notes=?, hook=?, links=?, tags=?, priority=?, scheduled_for=?, updated_at=? WHERE id=?",
    [
      n.title,
      n.description,
      n.category,
      n.status,
      n.notes,
      n.hook,
      JSON.stringify(n.links),
      JSON.stringify(n.tags),
      n.priority,
      n.scheduledFor,
      now(),
      id,
    ],
  );
  return getIdea(id);
}

export async function deleteIdea(id: string) {
  await db.run("DELETE FROM ideas WHERE id = ?", [id]);
  // Drafts written from this idea stay, but no longer point at it.
  await db.run("UPDATE drafts SET idea_id = NULL WHERE idea_id = ?", [id]);
}

// ---------- Drafts ----------

const toDraft = (r: Row): Draft => ({
  id: String(r.id),
  title: String(r.title),
  body: String(r.body),
  ideaId: str(r.idea_id),
  category: str(r.category),
  status: String(r.status) as Draft["status"],
  scheduledFor: str(r.scheduled_for),
  postedAt: str(r.posted_at),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

export async function listDrafts(): Promise<Draft[]> {
  return (await db.all("SELECT * FROM drafts ORDER BY updated_at DESC")).map(toDraft);
}

export async function getDraft(id: string): Promise<Draft | null> {
  const r = await db.get("SELECT * FROM drafts WHERE id = ?", [id]);
  return r ? toDraft(r) : null;
}

export async function createDraft(input: Partial<Draft> & { body: string }): Promise<Draft> {
  const id = newId();
  const t = now();
  const title = input.title?.trim() || input.body.split("\n").find((l) => l.trim())?.slice(0, 80) || "Untitled draft";
  const status = input.status ?? "drafting";
  await db.run(
    "INSERT INTO drafts (id, title, body, idea_id, category, status, scheduled_for, posted_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [
      id,
      title,
      input.body,
      input.ideaId ?? null,
      input.category ?? null,
      status,
      input.scheduledFor ?? null,
      input.postedAt ?? (status === "posted" ? t : null),
      t,
      t,
    ],
  );
  return (await getDraft(id))!;
}

export async function updateDraft(id: string, patch: Partial<Draft>): Promise<Draft | null> {
  const cur = await getDraft(id);
  if (!cur) return null;
  const n = { ...cur, ...patch };
  if (n.status === "posted" && !n.postedAt) n.postedAt = now();
  await db.run(
    "UPDATE drafts SET title=?, body=?, idea_id=?, category=?, status=?, scheduled_for=?, posted_at=?, updated_at=? WHERE id=?",
    [
      n.title,
      n.body,
      n.ideaId,
      n.category,
      n.status,
      n.scheduledFor,
      n.postedAt,
      now(),
      id,
    ],
  );
  return getDraft(id);
}

export async function deleteDraft(id: string) {
  await db.run("DELETE FROM drafts WHERE id = ?", [id]);
}

// ---------- Workspace Counts ----------

export async function getWorkspaceCounts(): Promise<WorkspaceCounts> {
  const [ideasRow, draftsRow] = await Promise.all([
    db.get("SELECT COUNT(*) as count FROM ideas WHERE status = 'idea'"),
    db.get("SELECT COUNT(*) as count FROM drafts WHERE status NOT IN ('posted', 'archived')"),
  ]);
  return {
    ideas: Number(ideasRow?.count ?? 0),
    drafts: Number(draftsRow?.count ?? 0),
  };
}
