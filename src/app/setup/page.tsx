import { SetPasswordForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f2] px-5 py-10">
      {token ? (
        <SetPasswordForm token={token} />
      ) : (
        <section className="auth-panel">
          <h1 className="text-2xl font-semibold text-[#111816]">Invite token missing</h1>
          <p className="mt-2 text-sm text-[#66736c]">Open the setup link from your invite email.</p>
        </section>
      )}
    </main>
  );
}
