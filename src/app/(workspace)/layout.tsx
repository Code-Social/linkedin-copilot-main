import { Shell } from "@/components/Shell";
import { getWorkspaceCounts } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const initialCounts = await getWorkspaceCounts();
  return <Shell initialCounts={initialCounts}>{children}</Shell>;
}
