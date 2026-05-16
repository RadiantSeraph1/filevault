import { NextResponse } from "next/server";
import { createInvite, requireOwner } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await requireOwner();
  const input = (await request.json()) as { email?: string };

  try {
    const { invite, token } = await createInvite({
      email: input.email ?? "",
      invitedBy: session.email,
    });
    await sendInviteEmail({ email: invite.email, token });

    return NextResponse.json({ ok: true, email: invite.email });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invite failed." },
      { status: 400 },
    );
  }
}
