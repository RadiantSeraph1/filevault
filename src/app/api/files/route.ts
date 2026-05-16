import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { listStoredFiles, saveStoredFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET() {
  await requireSession();
  return NextResponse.json({ files: await listStoredFiles() });
}

export async function POST(request: Request) {
  await requireSession();
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  }

  const stored = await saveStoredFile(file);
  return NextResponse.json({ file: stored }, { status: 201 });
}
