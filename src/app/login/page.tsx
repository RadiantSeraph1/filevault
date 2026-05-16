import { redirect } from "next/navigation";
import { BootstrapOwnerForm, LoginForm } from "@/components/auth-forms";
import { configuredOwnerEmail, getSession, readAuthState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "owner" ? "/admin" : "/");
  }

  const state = await readAuthState();
  const hasOwner = state.users.some((user) => user.role === "owner");
  const ownerEmail = configuredOwnerEmail();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f2] px-5 py-10">
      <div className="grid w-full max-w-5xl gap-5 md:grid-cols-2">
        <LoginForm ownerEmail={ownerEmail} />
        {!hasOwner ? (
          <BootstrapOwnerForm ownerEmail={ownerEmail} />
        ) : (
          <section className="auth-panel">
            <h2 className="text-2xl font-semibold text-[#111816]">Invite required</h2>
            <p className="mt-2 text-sm leading-6 text-[#66736c]">
              New users need an email invite from the owner before they can set a password.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
