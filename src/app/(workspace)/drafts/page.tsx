import { DraftsManager } from "@/components/DraftsManager";
import { listDrafts } from "@/lib/store";

export default async function DraftsPage() {
  const drafts = await listDrafts();
  return <DraftsManager drafts={drafts} />;
}
