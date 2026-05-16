import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { addFileComment } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireSession();
  const { id } = await params;
  const input = (await request.json()) as { author?: string; body?: string };

  try {
    const comment = await addFileComment(id, input);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save comment." },
      { status: 400 },
    );
  }
}
