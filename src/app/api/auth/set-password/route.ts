import { NextResponse } from "next/server";
import { consumeInvite, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const input = (await request.json()) as { token?: string; password?: string };

  try {
    const user = await consumeInvite({
      token: input.token ?? "",
      password: input.password ?? "",
    });
    await setSessionCookie(user);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Password setup failed." },
      { status: 400 },
    );
  }
}
