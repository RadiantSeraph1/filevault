import { NextResponse } from "next/server";
import { bootstrapOwner, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const input = (await request.json()) as {
    email?: string;
    password?: string;
    setupCode?: string;
  };

  try {
    const user = await bootstrapOwner({
      email: input.email ?? "",
      password: input.password ?? "",
      setupCode: input.setupCode ?? "",
    });
    await setSessionCookie(user);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Owner setup failed." },
      { status: 400 },
    );
  }
}
