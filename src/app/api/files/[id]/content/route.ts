import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { findStoredFile, readLocalFileBytes } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireSession();
  const { id } = await params;
  const file = await findStoredFile(id);

  if (!file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  if (file.url.startsWith("http")) {
    return NextResponse.redirect(file.url);
  }

  const bytes = await readLocalFileBytes(file);
  if (!bytes) {
    return NextResponse.json({ error: "File content is unavailable." }, { status: 404 });
  }

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": file.type,
      "Content-Disposition": `inline; filename="${file.name.replaceAll('"', "")}"`,
      "Cache-Control": "no-store",
    },
  });
}
