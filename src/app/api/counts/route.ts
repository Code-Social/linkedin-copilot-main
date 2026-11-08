import { handle } from "@/lib/api";
import { getWorkspaceCounts } from "@/lib/store";

export const dynamic = "force-dynamic";

export const GET = handle(async () => await getWorkspaceCounts());
