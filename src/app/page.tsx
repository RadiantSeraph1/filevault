import { FileRoom } from "@/components/file-room";
import { requireSession } from "@/lib/auth";
import { listStoredFiles } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await requireSession();
  const files = await listStoredFiles();

  return <FileRoom initialFiles={files} session={session} />;
}
