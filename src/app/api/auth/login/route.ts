import { NextResponse } from "next/server";
import { loginUser, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const input = (await request.json()) as { email?: string; password?: string };

  try {
    const user = await loginUser(input.email ?? "", input.password ?? "");
    await setSessionCookie(user);
    return NextResponse.json({ ok: true, role: user.role });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed." },
      { status: 401 },
    );
  }
}
