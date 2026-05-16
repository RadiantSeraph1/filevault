import { NextResponse } from "next/server";
import { deleteUser, requireOwner, toPublicUser, updateUser, type UserRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireOwner();
  const { id } = await params;
  const input = (await request.json()) as { email?: string; role?: UserRole };

  try {
    const user = await updateUser({
      userId: id,
      email: input.email ?? "",
      role: input.role === "owner" ? "owner" : "member",
      actorId: session.userId,
    });

    return NextResponse.json({ user: toPublicUser(user) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "User update failed." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireOwner();
  const { id } = await params;

  try {
    await deleteUser({ userId: id, actorId: session.userId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "User delete failed." },
      { status: 400 },
    );
  }
}
